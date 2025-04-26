import path from "path";
import {
    AnnotationNode, ArrayNode, AssertNode, AssignableNode, AssignmentNode, AwaitNode,
    BinaryOpNode, BreakNode, BreakpointNode,
    CallNode, CastNode, ClassNode, ConstantNode, ContinueNode,
    DictionaryNode,
    EnumNode,
    ForNode, FunctionNode,
    GetNodeNode,
    IdentifierNode, IfNode,
    LambdaNode, LiteralNode,
    MatchBranchNode, MatchNode,
    NodeType,
    ParameterNode, PassNode, PatternNode, PreloadNode,
    ReturnNode,
    SelfNode, SignalNode, SubscriptNode, SuiteNode,
    TernaryOpNode, TypeNode, TypeTestNode,
    UnaryOpNode,
    VariableNode,
    WhileNode
} from "./def.mts"
import { bin_op, ClassRepr, get_class_name, get_parent_name, un_op } from "./shared.mts";
import { block, Walker } from "./walker.mts";

export class WalkerHPP extends Walker {

    uses = new Set<string>()
    refs = new Set<string>()
    types = new Map<string, ClassRepr>()
    
    walk_assignable = (n: AssignableNode) => {
        let type = n.datatype_specifier
        let name = n.identifier!.name
        if(!type && n.initializer && n.initializer.type == NodeType.LITERAL){
            let init = n.initializer as LiteralNode
            if(typeof init.value == 'number'){
                if(init.value % 1 == 0) return `int ${name}`
                else return `float ${name}`
            } else if(typeof init.value == 'string'){
                return `String ${name}`
            } else if(typeof init.value == 'boolean'){
                return `bool ${name}`
            }
        }
        return `${this.walk_type(type)} ${name}`
    }
    walk_annotation = (n: AnnotationNode) => ``
    walk_array = (n: ArrayNode) => ``
    walk_assert = (n: AssertNode) => ``
    walk_assignment = (n: AssignmentNode) => ``
    walk_await = (n: AwaitNode) => ``
    walk_binary_op = (n: BinaryOpNode) => `${this.walk(n.left_operand!)} ${bin_op[n.operation]} ${this.walk(n.right_operand!)}`
    walk_break = (n: BreakNode) => ``
    walk_breakpoint = (n: BreakpointNode) => ``
    walk_call = (n: CallNode) => ``
    walk_cast = (n: CastNode) => ``
    walk_class = (n: ClassNode) => {
        let name = get_class_name(n)
        let parent_name = get_parent_name(n)
        if(this.types.get(parent_name)?.builtin === true)
            parent_name = `godot::${parent_name}`
        
        this.uses.add(parent_name.replace('godot::', ''))

        return `class ${name} `
        + (parent_name ? `: public ${parent_name} ` : ``)
        + block(
            `GDCLASS(${name}, ${parent_name})\n` +
            n.members.filter(m => 'type' in m).map(m => `public: ${this.walk(m)};`).join('\n')
        )
    }
    walk_constant = (n: ConstantNode) => `const ${this.walk_assignable(n)}`
    walk_continue = (n: ContinueNode) => ``
    walk_dictionary = (n: DictionaryNode) => ``
    walk_enum = (n: EnumNode) =>
        `enum class ${n.identifier!.name} ${block(
            n.values.map(v => `${v.identifier!.name} = ${v.custom_value ? this.walk(v.custom_value) : v.value}`).join(',\n')
        )}`
    walk_for = (n: ForNode) => ``
    walk_function = (n: FunctionNode) => `${this.walk_type(n.return_type!)} ${n.identifier!.name}(${n.parameters.map(p => this.walk(p)).join(', ')})`
    walk_get_node = (n: GetNodeNode) => ``
    walk_identifier = (n: IdentifierNode) => n.name
    walk_if = (n: IfNode) => ``
    walk_lambda = (n: LambdaNode) => ``
    walk_literal = (n: LiteralNode) => JSON.stringify(n.value)
    walk_match = (n: MatchNode) => ``
    walk_match_branch = (n: MatchBranchNode) => ``
    walk_parameter = (n: ParameterNode) => `${this.walk_assignable(n)}`
    walk_pass = (n: PassNode) => ``
    walk_pattern = (n: PatternNode) => ``
    walk_preload = (n: PreloadNode) => ``
    walk_return = (n: ReturnNode) => ``
    walk_self = (n: SelfNode) => ``
    walk_signal = (n: SignalNode) => `//signal ${n.identifier!.name}(${n.parameters.map(p => this.walk(p)).join(', ')})`
    walk_subscript = (n: SubscriptNode) => ``
    walk_suite = (n: SuiteNode) => ``
    walk_ternary_op = (n: TernaryOpNode) => ``
    walk_type = (n: TypeNode | undefined): string => {
        if (!n) return 'auto'
        if (!n.type_chain.length) return 'void'

        let chain = n.type_chain.map(id => id.name).join('::')

        if(['int', 'float', 'bool'].includes(chain)) return chain
        
        const opaque_types = [
            'Array', 'Callable', 'Dictionary', 'NodePath',
            'PackedByteArray', 'PackedColorArray', 'PackedFloat32Array', 'PackedFloat64Array',
            'PackedInt32Array', 'PackedInt64Array', 'PackedStringArray', 'PackedVector2Array',
            'PackedVector3Array', 'PackedVector4Array', 'RID', 'Signal',
            'StringName', 'String', 'Variant',
        ]

        let type = this.types.get(chain)
        if(type?.builtin === true) chain = `godot::${chain}`
        if(type?.type === 'class' && !opaque_types.includes(type.name!)){
            for(let next: undefined|ClassRepr = type; next; next = this.types.get(next.parent_name!)){
                if(next.name === 'RefCounted'){
                    this.uses.add('Ref')
                    this.uses.add(chain.replace('godot::', ''))
                    return `godot::Ref<${chain}>`
                }
            }
            this.refs.add(chain.replace('godot::', ''))
            return `${chain}*`
        }
        this.uses.add(chain.replace('godot::', ''))
        return chain
            //+ (n.container_types.length ? `<${n.container_types.map(this.walk_type).join(', ')}>` : ``)
    }
    walk_type_test = (n: TypeTestNode) => ``
    walk_unary_op = (n: UnaryOpNode) => `${un_op[n.operation]}${this.walk(n.operand!)}`
    walk_variable = (n: VariableNode) => `${this.walk_assignable(n)}`
    walk_while = (n: WhileNode) => ``
}