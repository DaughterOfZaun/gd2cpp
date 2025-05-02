import path from "path"
import { AssignmentNodeOperation, BinaryOpNodeOpType, ClassNode, EnumNode, TypeNode, UnaryOpNodeOpType } from "./def.mts"

export class CorrespMapType extends Map<TypeNode|ClassNode|EnumNode, ClassRepr> {}

export type NamespaceType = 'namespace' | 'class' | 'struct' | 'enum'
export class Namespace {
    name: string
    path: string
    type: NamespaceType = 'namespace'
    members = new Map<string, Namespace>()
    constructor(name: string, path: string){
        this.name = name
        this.path = path
    }
    get(name: string): undefined | Namespace {
        return this.members.get(name)
    }
    follow(path: string[]) {
        let current: undefined | Namespace = this
        for(let name of path){
            current = current.get(name)
            if(!current) break
        }
        if(current && current instanceof ClassRepr)
            return current
        //throw new Error(`Unresolved type path ${path.join('::')}`)
        return undefined
    }
    walk(cb: (chain: NamespaceChain, ns: Namespace) => void, chain = new NamespaceChain([ this ])){
        for(let m of this.members.values()){
            chain.push(m)
            cb(chain, m)
            m.walk(cb, chain)
            chain.pop()
        }
    }
}

export class ClassRepr extends Namespace {
    file: string
    parent?: ClassRepr
    parent_path?: string
    is_opaque: boolean

    ref_counted = false

    constructor(file: string, type: NamespaceType, name: string, path: string, parent_path?: string, is_opaque?: boolean){
        super(name, path)
        this.file = file
        this.type = type
        this.path = path
        this.parent_path = parent_path
        this.is_opaque = !!is_opaque
    }
}

export class NamespaceChain {
    chain: Namespace[]
    constructor(chain: Namespace[]){
        this.chain = chain
    }
    resolve(path: string[]) {
        for(let i = this.chain.length - 1; i >= 0; i--){
            let ns = this.chain[i]!
            let path_0 = path[0]!
            
            let current: undefined | Namespace = ns;
            do {
                if(current.name === path_0)
                    return current.follow(path.slice(1))
                else if(current.members.has(path_0))
                    return current.follow(path)

                if(current instanceof ClassRepr)
                    current = current.parent
                else break
            } while(current)
        }
        //throw new Error(`Unresolved type path ${path.join('::')}`)
        return undefined
    }
    push_new(file: string, ns_type: NamespaceType, name: string, path: string, extnds?: string, opaque?: boolean){
        let ns = this.chain.at(-1)!
        
        let new_ns = ns.get(name)
        //TODO: console.assert(!new_ns || ns_type === 'namespace')
        if(!new_ns){
            path = path ? path + '::' + name : name
            new_ns = ns_type === 'namespace' ? new Namespace(name, path) : new ClassRepr(file, ns_type, name, path, extnds, opaque)
            ns.members.set(name, new_ns)
        }

        this.chain.push(new_ns)
    }
    push(new_ns: Namespace){
        this.chain.push(new_ns)
    }
    pop(){
        this.chain.pop()
    }
    last(){
        return this.chain.at(-1)!
    }
    toString(){
        return this.chain.slice(1).map(ns => ns.name).join('::')
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
