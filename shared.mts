import path from "path"
import { AssignmentNodeOperation, BinaryOpNodeOpType, ClassNode, UnaryOpNodeOpType } from "./def.mts"

export type NamespaceType = 'namespace' | 'class' | 'struct' | 'enum'
export class Namespace {
    name: string
    type: NamespaceType = 'namespace'
    members = new Map<string, Namespace>()
    constructor(name: string){
        this.name = name
    }
    get(name: string): undefined | Namespace {
        return this.members.get(name)
    }
    follow(path: string[]) {
        let chain: Namespace[] = [ this ]
        let current: undefined | Namespace = this
        for(let name of path){
            current = current.get(name)
            if(!current) break
            chain.push(current)
        }
        if(current && current instanceof ClassRepr)
            return chain as [...Namespace[], ClassRepr]
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
    path: string
    parent_name?: string
    parent?: ClassRepr
    constructor(path: string, type: NamespaceType, name: string, parent_name?: string){
        super(name)
        this.path = path
        this.type = type
        this.parent_name = parent_name
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
            
            if(ns.members.has(path[0]!)){
                
                let trail = ns.follow(path)
                if(!trail) return undefined

                return new NamespaceChain([
                    ...this.chain.slice(0, i),
                    ...trail
                ])
            }
        }
        //throw new Error(`Unresolved type path ${path.join('::')}`)
        return undefined
    }
    push_new(path: string, ns_type: NamespaceType, name: string, extnds?: string){
        let ns = this.chain.at(-1)!

        let new_ns = ns.get(name)
        //TODO: console.assert(!new_ns || ns_type === 'namespace')
        if(!new_ns){
            new_ns = ns_type === 'namespace' ? new Namespace(name) : new ClassRepr(path, ns_type, name, extnds)
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
}

export const get_class_name = (n: ClassNode) =>
    n.identifier?.name ?? (
        n.fqcn.endsWith('.gd') ?
        path.basename(n.fqcn, '.gd').replace(/^(\w)|_(\w)/g, (m, g1, g2) => (g1 || g2).toUpperCase()) :
        n.fqcn
    )

export const get_parent_name = (n: ClassNode) =>
    n.extends?.map(id => id.name).join('::') || 'RefCounted'

export const assign_op = {
    [AssignmentNodeOperation.NONE]: '',
    [AssignmentNodeOperation.ADDITION]: '+',
    [AssignmentNodeOperation.SUBTRACTION]: '-',
    [AssignmentNodeOperation.MULTIPLICATION]: '*',
    [AssignmentNodeOperation.DIVISION]: '/',
    [AssignmentNodeOperation.MODULO]: '%',
    [AssignmentNodeOperation.POWER]: '', //TODO:
    [AssignmentNodeOperation.BIT_SHIFT_LEFT]: '<<',
    [AssignmentNodeOperation.BIT_SHIFT_RIGHT]: '>>',
    [AssignmentNodeOperation.BIT_AND]: '&',
    [AssignmentNodeOperation.BIT_OR]: '|',
    [AssignmentNodeOperation.BIT_XOR]: '^',
}

export const bin_op = {
    [BinaryOpNodeOpType.ADDITION]: '+',
    [BinaryOpNodeOpType.SUBTRACTION]: '-',
    [BinaryOpNodeOpType.MULTIPLICATION]: '*',
    [BinaryOpNodeOpType.DIVISION]: '/',
    [BinaryOpNodeOpType.MODULO]: '%',
    [BinaryOpNodeOpType.POWER]: '', //TODO:
    [BinaryOpNodeOpType.BIT_LEFT_SHIFT]: '<<',
    [BinaryOpNodeOpType.BIT_RIGHT_SHIFT]: '>>',
    [BinaryOpNodeOpType.BIT_AND]: '&',
    [BinaryOpNodeOpType.BIT_OR]: '|',
    [BinaryOpNodeOpType.BIT_XOR]: '^',
    [BinaryOpNodeOpType.LOGIC_AND]: '&&',
    [BinaryOpNodeOpType.LOGIC_OR]: '||',
    [BinaryOpNodeOpType.CONTENT_TEST]: 'in', //TODO:
    [BinaryOpNodeOpType.COMP_EQUAL]: '==',
    [BinaryOpNodeOpType.COMP_NOT_EQUAL]: '!=',
    [BinaryOpNodeOpType.COMP_LESS]: '<',
    [BinaryOpNodeOpType.COMP_LESS_EQUAL]: '<=',
    [BinaryOpNodeOpType.COMP_GREATER]: '>',
    [BinaryOpNodeOpType.COMP_GREATER_EQUAL]: '>=',
}

export const un_op = {
    [UnaryOpNodeOpType.POSITIVE]: '+',
    [UnaryOpNodeOpType.NEGATIVE]: '-',
    [UnaryOpNodeOpType.COMPLEMENT]: '~',
    [UnaryOpNodeOpType.LOGIC_NOT]: '!',
}
