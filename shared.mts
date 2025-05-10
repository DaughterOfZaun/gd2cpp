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

    file?: string

    is_opaque = false
    is_ref_counted = false

    get(name: string): undefined | Namespace {
        return this.members.get(name)
    }
    
    follow(path: string[]) {
        let current: undefined | Namespace = this
        for(let name of path){
            current = current.get(name)
            if(!current) break
        }
        if(!current){
            //throw new Error(`Unresolved type path ${path.join('::')}`)
        }
        return current
    }
    
    walk(cb: (ns: Namespace) => void){
        for(let m of this.members.values()){
            cb(m)
            m.walk(cb)
        }
    }
    
    resolve(path: string[]) {
        let path_0 = path[0]!
        for(let ns: undefined | Namespace = this; ns; ns = ns.parent){
            for(let current: Namespace = ns; current; current = current.extnds!){
                if(current.name === path_0)
                    return current.follow(path.slice(1))
                else if(current.members.has(path_0))
                    return current.follow(path)
            }
        }
        //throw new Error(`Unresolved type path ${path.join('::')}`)
        return undefined
    }

    push_new(file: string, type: NamespaceType, name: string, extnds_path?: string, is_opaque?: boolean){
        let ns = this.get(name)
        //TODO: console.assert(!ns || (ns.type == type && type === 'namespace'))
        if(!ns){
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
    
    private path?: string
    toString(){
        if(this.path) return this.path
        let path = ''
        for(let ns: undefined | Namespace = this; ns; ns = ns.parent){
            if(path) path += '::'
            path += ns.name
        }
        this.path = path
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
