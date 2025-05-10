import { UnaryOpNodeOpType, type ArrayNode, type AssignmentNode, type AwaitNode, type BinaryOpNode, type CallNode, type CastNode, type DictionaryNode, type GetNodeNode, type IdentifierNode, type LambdaNode, type LiteralNode, type Node, type PreloadNode, type SelfNode, type SubscriptNode, type TernaryOpNode, type TypeTestNode, type UnaryOpNode } from "./def.mts"
import type { CorrespMapType, Namespace } from "./shared.mts"
import { Walker } from "./walker.mts"

export type CachedTypesNames =
    'array' | 'dictionary' | 'node' |
    'int' | 'float' | 'string' | 'bool' | 'void' | 'auto' | // 'variant' |
    'ref' | 'ref_counted' | 'callable' | 'signal'
export type CachedTypes = {
    [key in CachedTypesNames]: Namespace
}
export class ExprTypeResolver extends Walker<Namespace> {
    
    current_class!: Namespace
    current_ns!: Namespace
    corresp: CorrespMapType
    cached_types: CachedTypes

    constructor(/*cls: Namespace, ns: Namespace,*/ corresp: CorrespMapType, types: CachedTypes){
        super()
        //this.current_class = cls
        //this.current_ns = ns
        this.corresp = corresp
        this.cached_types = types
    }

    walk(n: Node) {
        let ns = this.corresp.get(n)
        if(!ns)
            this.corresp.set(n, ns = super.walk(n))
        return ns
    }
    walk_array(n: ArrayNode) {
        //for(let expr of n.elements)
        //    this.walk(expr)
        return this.cached_types.array
    }
    walk_assignment(n: AssignmentNode) {
        //this.walk(n.assigned_value!)
        return this.walk(n.assignee!)
    }
    walk_await(n: AwaitNode) {
        return this.walk(n.to_await!)
    }
    walk_binary_op(n: BinaryOpNode) {
        let lns = this.walk(n.left_operand!)
        let rns = this.walk(n.left_operand!)
        console.assert(lns == rns) //TODO: Fix
        return lns
    }
    walk_call(n: CallNode) {
        let ns = this.walk(n.callee!)
        //ns = ns.parent!.locals.get(ns.name)!
        return ns.returns ?? this.cached_types.auto
    }
    walk_cast(n: CastNode) {
        //this.walk(n.operand!)
        return this.corresp.get(n.cast_type!)!
    }
    walk_dictionary(n: DictionaryNode) {
        return this.cached_types.dictionary
    }
    walk_get_node(n: GetNodeNode) {
        return this.cached_types.node
    }
    walk_identifier(n: IdentifierNode) {
        return this.current_ns.resolve([ n.name ]) ?? this.cached_types.auto
    }
    walk_lambda(n: LambdaNode) {
        return this.cached_types.callable
    }
    walk_literal(n: LiteralNode) {
        if(typeof n.value == 'number'){
            if(n.value % 1 == 0)
                return this.cached_types.int
            else
                return this.cached_types.float
        } else if(typeof n.value == 'string'){
            return this.cached_types.string
        } else if(typeof n.value == 'boolean'){
            return this.cached_types.bool
        }
        throw new Error(`Unable to resolve literal value (${n.value}) type`)
    }
    walk_preload(n: PreloadNode) {
        return this.cached_types.auto
    }
    walk_self(n: SelfNode) {
        return this.current_class
    }
    walk_subscript(n: SubscriptNode) { //TODO: locals: Map<string, NSRef { ns: NS, generic_args: NS[] }>
        let base_ns = this.walk(n.base!)
        if(n.is_attribute){
            let type = base_ns.resolve([ n.attribute!.name ])!
            return type || this.cached_types.auto
        }
        return this.cached_types.auto
    }
    walk_ternary_op(n: TernaryOpNode) {
        let lns = this.walk(n.true_expr!)
        let rns = this.walk(n.false_expr!)
        console.assert(lns == rns) //TODO: Fix
        return lns
    }
    walk_type_test(n: TypeTestNode) {
        return this.cached_types.bool
    }
    walk_unary_op(n: UnaryOpNode) { //TODO: Vectors
        if(n.operation == UnaryOpNodeOpType.LOGIC_NOT) return this.cached_types.bool
        if(n.operation == UnaryOpNodeOpType.COMPLEMENT) return this.cached_types.int
        return this.walk(n.operand!)
    }
}