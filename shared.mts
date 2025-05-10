import path from "path"
import { AssignmentNodeOperation, BinaryOpNodeOpType, ClassNode, EnumNode, FunctionNode, Node, SuiteNode, TypeNode, UnaryOpNodeOpType } from "./def.mts"

export class CorrespMapType extends Map<Node, Namespace> {}

export type NamespaceType = 'namespace' | 'class' | 'struct' | 'enum' | 'primitive' | 'method' | 'block'
export class Namespace {
    name!: string
    type: NamespaceType = 'namespace'

    members = new Map<string, Namespace>()
    locals = new Map<string, Namespace>()
    
    parent?: Namespace
    extnds?: Namespace
    extnds_path?: string
    returns?: Namespace

    file?: string

    is_opaque = false
    is_ref_counted = false

    get(name: string): undefined | Namespace {
        return this.locals.get(name) ?? this.members.get(name)
    }

    walk(cb: (ns: Namespace) => void){
        for(let m of this.members.values()){
            cb(m)
            m.walk(cb)
        }
    }
    
    resolve(path: string[], debug = false) {
        let path_0 = path.shift()!
        let current: undefined | Namespace;
        outer_loop: for(let ns: undefined | Namespace = this; ns; ns = ns.parent!){
            inner_loop: for(current = ns; current; current = current.extnds!){
                if(current.name === path_0){
                    break outer_loop
                } else {
                    let tmp = current.get(path_0)
                    if(tmp){
                        current = tmp
                        break outer_loop
                    }
                }
            }
        }
        if(current){
            for(let name of path){
                current = current.get(name)
                if(!current) break
            }
        }
        if(!current && !debug){
            path.unshift(path_0)
            //throw new Error(`Unresolved type path ${path.join('::')}`)
            console.log(`Unresolved type path ${this.path}...${path.join('::')}`)
            //this.resolve(path, true)
        }
        return current
    }

    push_new(file: string, type: NamespaceType, name: string, extnds_path?: string, is_opaque?: boolean){
        let ns = this.get(name)
        //TODO: console.assert(!ns || (ns.type == type && type === 'namespace'))
        if(!ns || ns.name === 'auto'){ //HACK:
            ns = new Namespace()
            
            ns.file = file
            ns.type = type
            ns.name = name
            ns.extnds_path = extnds_path
            ns.is_opaque = !!is_opaque
            
            ns.parent = this
            this.members.set(name, ns)
        }
        return this.push(ns)
    }
    
    push(new_ns: Namespace){
        console.assert(new_ns.parent == this)
        return new_ns
    }
    
    pop(){
        return this.parent
    }
    
    last(){
        return this
    }
    
    private _path?: string
    public get path(): string {
        if(this._path) return this._path
        
        let parents: string[] = []
        for(let ns: undefined | Namespace = this; ns && ns.parent; ns = ns.parent){
            parents.unshift(ns.name)
        }
        if(parents[0] == 'godot')
            parents.shift()
        let path = parents.join('::')

        this._path = path
        return path
    }
}

export const get_class_name = (n: ClassNode) =>
    n.identifier?.name ?? (
        n.fqcn.endsWith('.gd') ?
        path.basename(n.fqcn, '.gd').replace(/^(\w)|_(\w)/g, (m, g1, g2) => (g1 || g2).toUpperCase()) :
        n.fqcn
    )

export const get_parent_name = (n: ClassNode) =>
    n.extends?.map(id => id.name).join('::') || 'RefCounted'
