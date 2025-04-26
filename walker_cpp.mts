import {
    AnnotationNode, ArrayNode, AssertNode, AssignableNode, AssignmentNode, AssignmentNodeOperation, AwaitNode,
    BinaryOpNode, BinaryOpNodeOpType, BreakNode, BreakpointNode,
    CallNode, CastNode, ClassNode, ConstantNode, ContinueNode,
    DictionaryNode,
    EnumNode,
    ForNode, FunctionNode,
    GetNodeNode,
    IdentifierNode, IfNode,
    LambdaNode, LiteralNode,
    MatchBranchNode, MatchNode,
    ParameterNode, PassNode, PatternNode, PreloadNode,
    ReturnNode,
    SelfNode, SignalNode, SubscriptNode, SuiteNode,
    TernaryOpNode, TypeNode, TypeTestNode,
    UnaryOpNode,
    UnaryOpNodeOpType,
    VariableNode,
    WhileNode
} from "./def.mts"
import { assign_op, bin_op, un_op } from "./shared.mts"
import { block, Walker } from "./walker.mts"

export class WalkerCPP extends Walker {
    walk_assignable = (n: AssignableNode) =>
        `${this.walk_type(n.datatype_specifier!)} ${n.identifier!.name}`
        + (n.initializer ? ` = ${this.walk(n.initializer)}` : ``)
    walk_annotation = (n: AnnotationNode) => `//${n.name}(${n.arguments.map(a => this.walk(a))})`
    walk_array = (n: ArrayNode) => `{${n.elements.map(e => this.walk(e)).join(', ')}}`
    walk_assert = (n: AssertNode) =>
        `assert(${this.walk(n.condition!)}`
        + (n.message ? `, ${this.walk(n.message!)}` : ``)
        + `)`
    walk_assignment = (n: AssignmentNode) => `${this.walk(n.assignee!)} ${assign_op[n.operation]}= ${this.walk(n.assigned_value!)}` //TODO: variant_op?
    walk_await = (n: AwaitNode) => `co_await ${this.walk(n.to_await!)}`
    walk_binary_op = (n: BinaryOpNode) => `${this.walk(n.left_operand!)} ${bin_op[n.operation]} ${this.walk(n.right_operand!)}` //TODO: variant_op?
    walk_break = (n: BreakNode) => `break`
    walk_breakpoint = (n: BreakpointNode) => `breakpoint()`
    walk_call = (n: CallNode) => `${this.walk(n.callee!)}(${n.arguments.map(arg => this.walk(arg)).join(', ')})` //TODO: function_name? is_super? is_static?
    walk_cast = (n: CastNode) => `(${this.walk_type(n.cast_type!)})${this.walk(n.operand!)}`
    walk_class = (n: ClassNode) =>
        `class ${n.fqcn} ${block(
            n.members.filter(m => 'type' in m).map(m => `${this.walk(m)}`).join('\n')
        )}`
    walk_constant = (n: ConstantNode) => `const ${this.walk_assignable(n)}`
    walk_continue = (n: ContinueNode) => `continue`
    walk_dictionary = (n: DictionaryNode) => `{${
        n.elements.map(e => `{${this.walk(e.key!)}, ${this.walk(e.value!)}}`).join(', ')
    }}`
    walk_enum = (n: EnumNode) =>
        `enum ${n.identifier!.name} ${block(
            n.values.map(v => `${v.identifier!.name} = ${v.custom_value ? this.walk(v.custom_value) : v.value}`).join(',\n')
        )}`
    walk_for = (n: ForNode) =>
        `for(${this.walk_type(n.datatype_specifier!)} ${n.variable!.name} : ${this.walk(n.list!)}) ${block(
            this.walk(n.loop!)
        )}`
    walk_function = (n: FunctionNode) => `${this.walk_type(n.return_type!)} ${n.identifier!.name}(${n.parameters.map(p => this.walk(p)).join(', ')}) ${block(this.walk(n.body!))}`
    walk_get_node = (n: GetNodeNode) => `get_node("${n.full_path}")` //TODO: use_dollar?
    walk_identifier = (n: IdentifierNode) => n.name
    walk_if = (n: IfNode) =>
        `if(${this.walk(n.condition!)}) ${block(
            this.walk(n.true_block!)
        )}` + (n.false_block ? ` else ${block(
            this.walk(n.false_block)
        )}` : ``)
    walk_lambda = (n: LambdaNode) =>
        `[&](${n.function!.parameters.map(p => this.walk(p)).join(', ')})`
        + (n.function!.return_type ? ` -> ${this.walk_type(n.function!.return_type)}` : ``)
        + block(
            this.walk(n.function!.body!)
        )
    walk_literal = (n: LiteralNode) => JSON.stringify(n.value)
    walk_match = (n: MatchNode) => n.branches.map(b => this.walk_match_branch(b)).join(' else ')
    walk_match_branch = (n: MatchBranchNode) => {
        let patterns = n.patterns.map(p => this.walk_pattern(p))
        return `if(${patterns.join('&&')}) ${block(
            this.walk(n.block!)
        )}`
    }
    walk_parameter = (n: ParameterNode) => this.walk_assignable(n)
    walk_pass = (n: PassNode) => ``
    walk_pattern = (n: PatternNode) => `PATTERN` //TODO:
    walk_preload = (n: PreloadNode) => `preload(${this.walk(n.path!)})` //TODO: resolved_path?
    walk_return = (n: ReturnNode) => `return` + (n.void_return ? ` ${this.walk(n.return_value!)}` : ``)
    walk_self = (n: SelfNode) => `self`
    walk_signal = (n: SignalNode) => `//signal ${n.identifier!.name}(${n.parameters.map(p => this.walk(p)).join(', ')})` //TODO:
    walk_subscript = (n: SubscriptNode) => `${this.walk(n.base!)}${n.is_attribute ? `.${n.attribute!.name}` : `[${this.walk(n.index!)}]`}`
    walk_suite = (n: SuiteNode) => n.statements.map(s => `${this.walk(s!)}`).join('\n') //TODO:
    walk_ternary_op = (n: TernaryOpNode) => `(${this.walk(n.condition!)}) ? (${this.walk(n.true_expr!)}) : (${this.walk(n.false_expr!)})`
    walk_type = (n: TypeNode | undefined): string => {
        if (!n) return 'auto'
        if (!n.type_chain.length) return 'void'
        return n.type_chain.map(id => id.name).join('::')
            + (n.container_types.length ? `<${n.container_types.map(this.walk_type).join(', ')}>` : ``)
    }
    walk_type_test = (n: TypeTestNode) => `TYPE_TEST` //TODO:
    walk_unary_op = (n: UnaryOpNode) => `${un_op[n.operation]}${this.walk(n.operand!)}` //TODO: variant_op?
    walk_variable = (n: VariableNode) => `${this.walk_assignable(n)}`
    walk_while = (n: WhileNode) =>
        `while(${this.walk(n.condition!)}) ${block(
            this.walk(n.loop!)
        )}`
}