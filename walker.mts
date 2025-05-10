import {
    AnnotationNode, ArrayNode, AssertNode, AssignmentNode, AwaitNode,
    BinaryOpNode, BreakNode, BreakpointNode,
    CallNode, CastNode, ClassNode, ConstantNode, ContinueNode,
    DictionaryNode,
    EnumNode,
    ForNode, FunctionNode,
    GetNodeNode,
    IdentifierNode, IfNode,
    LambdaNode, LiteralNode,
    MatchBranchNode, MatchNode,
    Node, NodeType,
    ParameterNode, PassNode, PatternNode, PreloadNode,
    ReturnNode,
    SelfNode, SignalNode, SubscriptNode, SuiteNode,
    TernaryOpNode, TypeNode, TypeTestNode,
    UnaryOpNode,
    VariableNode,
    WhileNode
} from "./def.mts"

const TAB = '    '
export function block(code: string): string {
    if(code.trim() == '') return `{}`
    return `{\n` + code.split('\n').map(line => TAB + line).join('\n') + `\n}`
}

export abstract class Walker<T = string> {
    walk(node: Node): T {
        switch (node.type) {
            case NodeType.NONE: throw new Error()
            case NodeType.ANNOTATION: return this.walk_annotation(node as AnnotationNode)
            case NodeType.ARRAY: return this.walk_array(node as ArrayNode)
            case NodeType.ASSERT: return this.walk_assert(node as AssertNode)
            case NodeType.ASSIGNMENT: return this.walk_assignment(node as AssignmentNode)
            case NodeType.AWAIT: return this.walk_await(node as AwaitNode)
            case NodeType.BINARY_OPERATOR: return this.walk_binary_op(node as BinaryOpNode)
            case NodeType.BREAK: return this.walk_break(node as BreakNode)
            case NodeType.BREAKPOINT: return this.walk_breakpoint(node as BreakpointNode)
            case NodeType.CALL: return this.walk_call(node as CallNode)
            case NodeType.CAST: return this.walk_cast(node as CastNode)
            case NodeType.CLASS: return this.walk_class(node as ClassNode)
            case NodeType.CONSTANT: return this.walk_constant(node as ConstantNode)
            case NodeType.CONTINUE: return this.walk_continue(node as ContinueNode)
            case NodeType.DICTIONARY: return this.walk_dictionary(node as DictionaryNode)
            case NodeType.ENUM: return this.walk_enum(node as EnumNode)
            case NodeType.FOR: return this.walk_for(node as ForNode)
            case NodeType.FUNCTION: return this.walk_function(node as FunctionNode)
            case NodeType.GET_NODE: return this.walk_get_node(node as GetNodeNode)
            case NodeType.IDENTIFIER: return this.walk_identifier(node as IdentifierNode)
            case NodeType.IF: return this.walk_if(node as IfNode)
            case NodeType.LAMBDA: return this.walk_lambda(node as LambdaNode)
            case NodeType.LITERAL: return this.walk_literal(node as LiteralNode)
            case NodeType.MATCH: return this.walk_match(node as MatchNode)
            case NodeType.MATCH_BRANCH: return this.walk_match_branch(node as MatchBranchNode)
            case NodeType.PARAMETER: return this.walk_parameter(node as ParameterNode)
            case NodeType.PASS: return this.walk_pass(node as PassNode)
            case NodeType.PATTERN: return this.walk_pattern(node as PatternNode)
            case NodeType.PRELOAD: return this.walk_preload(node as PreloadNode)
            case NodeType.RETURN: return this.walk_return(node as ReturnNode)
            case NodeType.SELF: return this.walk_self(node as SelfNode)
            case NodeType.SIGNAL: return this.walk_signal(node as SignalNode)
            case NodeType.SUBSCRIPT: return this.walk_subscript(node as SubscriptNode)
            case NodeType.SUITE: return this.walk_suite(node as SuiteNode)
            case NodeType.TERNARY_OPERATOR: return this.walk_ternary_op(node as TernaryOpNode)
            case NodeType.TYPE: return this.walk_type(node as TypeNode)
            case NodeType.TYPE_TEST: return this.walk_type_test(node as TypeTestNode)
            case NodeType.UNARY_OPERATOR: return this.walk_unary_op(node as UnaryOpNode)
            case NodeType.VARIABLE: return this.walk_variable(node as VariableNode)
            case NodeType.WHILE: return this.walk_while(node as WhileNode)
        }
    }
    walk_annotation(n: AnnotationNode): T { throw new Error("Method not implemented.") }
    walk_array(n: ArrayNode): T { throw new Error("Method not implemented.") }
    walk_assert(n: AssertNode): T { throw new Error("Method not implemented.") }
    walk_assignment(n: AssignmentNode): T { throw new Error("Method not implemented.") }
    walk_await(n: AwaitNode): T { throw new Error("Method not implemented.") }
    walk_binary_op(n: BinaryOpNode): T { throw new Error("Method not implemented.") }
    walk_break(n: BreakNode): T { throw new Error("Method not implemented.") }
    walk_breakpoint(n: BreakpointNode): T { throw new Error("Method not implemented.") }
    walk_call(n: CallNode): T { throw new Error("Method not implemented.") }
    walk_cast(n: CastNode): T { throw new Error("Method not implemented.") }
    walk_class(n: ClassNode): T { throw new Error("Method not implemented.") }
    walk_constant(n: ConstantNode): T { throw new Error("Method not implemented.") }
    walk_continue(n: ContinueNode): T { throw new Error("Method not implemented.") }
    walk_dictionary(n: DictionaryNode): T { throw new Error("Method not implemented.") }
    walk_enum(n: EnumNode): T { throw new Error("Method not implemented.") }
    walk_for(n: ForNode): T { throw new Error("Method not implemented.") }
    walk_function(n: FunctionNode): T { throw new Error("Method not implemented.") }
    walk_get_node(n: GetNodeNode): T { throw new Error("Method not implemented.") }
    walk_identifier(n: IdentifierNode): T { throw new Error("Method not implemented.") }
    walk_if(n: IfNode): T { throw new Error("Method not implemented.") }
    walk_lambda(n: LambdaNode): T { throw new Error("Method not implemented.") }
    walk_literal(n: LiteralNode): T { throw new Error("Method not implemented.") }
    walk_match(n: MatchNode): T { throw new Error("Method not implemented.") }
    walk_match_branch(n: MatchBranchNode): T { throw new Error("Method not implemented.") }
    walk_parameter(n: ParameterNode): T { throw new Error("Method not implemented.") }
    walk_pass(n: PassNode): T { throw new Error("Method not implemented.") }
    walk_pattern(n: PatternNode): T { throw new Error("Method not implemented.") }
    walk_preload(n: PreloadNode): T { throw new Error("Method not implemented.") }
    walk_return(n: ReturnNode): T { throw new Error("Method not implemented.") }
    walk_self(n: SelfNode): T { throw new Error("Method not implemented.") }
    walk_signal(n: SignalNode): T { throw new Error("Method not implemented.") }
    walk_subscript(n: SubscriptNode): T { throw new Error("Method not implemented.") }
    walk_suite(n: SuiteNode): T { throw new Error("Method not implemented.") }
    walk_ternary_op(n: TernaryOpNode): T { throw new Error("Method not implemented.") }
    walk_type(n: TypeNode): T { throw new Error("Method not implemented.") }
    walk_type_test(n: TypeTestNode): T { throw new Error("Method not implemented.") }
    walk_unary_op(n: UnaryOpNode): T { throw new Error("Method not implemented.") }
    walk_variable(n: VariableNode): T { throw new Error("Method not implemented.") }
    walk_while(n: WhileNode): T { throw new Error("Method not implemented.") }
}
