import path from "path"
import {
    AssignmentNodeOperation,
    BinaryOpNodeOpType,
    UnaryOpNodeOpType,
    IdentifierNode,
    TypeNode,
    AnnotationNode,
    ArrayNode,
    AssertNode,
    AssignableNode,
    AssignmentNode,
    AwaitNode,
    BinaryOpNode,
    BreakNode,
    BreakpointNode,
    CallNode,
    CastNode,
    ClassNode,
    ConstantNode,
    ContinueNode,
    DictionaryNode,
    EnumNode,
    ForNode,
    FunctionNode,
    GetNodeNode,
    IfNode,
    LambdaNode,
    LiteralNode,
    MatchBranchNode,
    MatchNode,
    ParameterNode,
    PassNode,
    PatternNode,
    PreloadNode,
    ReturnNode,
    SelfNode,
    SignalNode,
    SubscriptNode,
    SuiteNode,
    TernaryOpNode,
    TypeTestNode,
    UnaryOpNode,
    VariableNode,
    WhileNode
} from "./def.mts"
import type { Namespace, CorrespMapType, NamespaceType } from "./shared.mts"
import { block, Walker } from "./walker.mts"

export class WalkerXPP extends Walker {

    corresp: CorrespMapType
    ref: Namespace
    
    uses = new Set<Namespace>()
    refs = new Set<Namespace>()
    
    constructor(corresp: CorrespMapType, { ref }: { [key: string]: Namespace }){
        super()
        this.corresp = corresp
        this.ref = ref!
    }

    gen_uses(out_path: string, out_path_dir: string){
        return ``
        + this.uses.values()
            .filter(cls => cls.file && cls.file.startsWith('godot_cpp/'))
            .map(cls => {
                return `#include <${cls.file}>\n`
            })
            .reduce((s, v) => s.add(v), new Set<string>()).values()
            .toArray().toSorted().join('')
        
        + this.uses.values()
            .filter(cls => cls.file && !cls.file.startsWith('godot_cpp/'))
            .map(cls => {
                let inc_path = path.join('src', cls.file!)
                if(inc_path == out_path) return `` // Don't include self
                return `#include "${path.relative(out_path_dir, inc_path)}"\n`
            })
            .reduce((s, v) => s.add(v), new Set<string>()).values()
            .toArray().toSorted().join('')
    }

    gen_refs(cls_name: string){
        return this.refs.values()
            .filter(cls => cls.name != cls_name) // Don't declare self
            .map(cls => `class ${cls.name};\n`)
            .toArray().join('')
    }

    walk_identifier_not_expr(n: IdentifierNode): string {
        return (['register', 'char', 'default'].includes(n.name) ? `$` : ``) + n.name
    }

    walk_identifier(n: IdentifierNode): string {
        return this.walk_identifier_not_expr(n)
    }

    walk_type(n: TypeNode | undefined): string {
        if (!n) return 'auto'
        if (!n.type_chain.length) return 'void'

        let type = this.corresp.get(n)
        if(!type){
            return n.type_chain.map(id => id.name).join('::')
        }

        if(type.type === 'class' && !type.is_opaque){
            if(type.is_ref_counted){
                let ref = this.ref
                this.uses.add(ref)
                this.uses.add(type)
                return `${ref.path}<${type.path}>`
            } else {
                if(type.file!.startsWith('godot_cpp/'))
                    this.uses.add(type) //HACK: 
                else
                    this.refs.add(type)
                return `${type.path}*`
            }
        } else {
            this.uses.add(type)
            return type.path
                //+ (n.container_types.length ? `<${n.container_types.map(this.walk_type).join(', ')}>` : ``)
        }
    }

    walk_assignable(n: AssignableNode){
        return `${this.walk_type(n.datatype_specifier!)} ${this.walk_identifier_not_expr(n.identifier!)}`
            + (n.initializer ? ` = ${this.walk(n.initializer)}` : ``)
    }
    walk_annotation(n: AnnotationNode){
        return `//${n.name}(${n.arguments.map(a => this.walk(a))})`
    }
    walk_array(n: ArrayNode){
        return `Array::make(${n.elements.map(e => this.walk(e)).join(', ')})`
    }
    walk_assert(n: AssertNode){
        return `assert(${this.walk(n.condition!)}`
            + (n.message ? `, ${this.walk(n.message!)}` : ``)
            + `)`
    }
    walk_assignment(n: AssignmentNode){
        return `${this.walk(n.assignee!)} ${assign_op[n.operation]}= ${this.walk(n.assigned_value!)}` //TODO: variant_op?
    }
    walk_await(n: AwaitNode){
        return `co_await ${this.walk(n.to_await!)}`
    }
    walk_binary_op(n: BinaryOpNode){
        if(n.operation == BinaryOpNodeOpType.CONTENT_TEST)
            return `${this.walk(n.right_operand!)}.has(${this.walk(n.left_operand!)})`
        return `${this.walk(n.left_operand!)} ${bin_op[n.operation]} ${this.walk(n.right_operand!)}` //TODO: variant_op?
    }
    walk_break(n: BreakNode){
        return `break`
    }
    walk_breakpoint(n: BreakpointNode){
        return `breakpoint()`
    }
    walk_call(n: CallNode){
        return `${this.walk(n.callee!)}(${n.arguments.map(arg => this.walk(arg)).join(', ')})` //TODO: function_name? is_super? is_static?
    }
    walk_cast(n: CastNode){
        return `(${this.walk_type(n.cast_type!)})${this.walk(n.operand!)}`
    }
    walk_class(n: ClassNode){
        return `class ${n.fqcn} ${block(
            n.members.filter(m => 'type' in m).map(m => `${this.walk(m)}`).join('\n')
        )}`
    }
    walk_constant(n: ConstantNode){
        return `const ${this.walk_assignable(n)}`
    }
    walk_continue(n: ContinueNode){
        return `continue`
    }
    walk_dictionary(n: DictionaryNode){
        return `{${
            n.elements.map(e => `{${this.walk(e.key!)}, ${this.walk(e.value!)}}`).join(', ')
        }}`
    }
    walk_enum(n: EnumNode){
        return `enum ${this.walk_identifier_not_expr(n.identifier!)} ${block(
            n.values.map(v => `${this.walk_identifier_not_expr(v.identifier!)} = ${v.custom_value ? this.walk(v.custom_value) : v.value}`).join(',\n')
        )}`
    }
    walk_for(n: ForNode){
        return `for(${this.walk_type(n.datatype_specifier!)} ${this.walk_identifier_not_expr(n.variable!)} : ${this.walk(n.list!)}) ${block(
            this.walk(n.loop!)
        )}`
    }
    walk_function(n: FunctionNode){
        return `${this.walk_type(n.return_type!)} ${this.walk_identifier_not_expr(n.identifier!)}(${n.parameters.map(p => this.walk(p)).join(', ')}) ${block(this.walk(n.body!))}`
    }
    walk_get_node(n: GetNodeNode){
        return `get_node("${n.full_path}")` //TODO: use_dollar?
    }
    walk_if(n: IfNode){
        return `if(${this.walk(n.condition!)}) ${block(
            this.walk(n.true_block!)
        )}` + (n.false_block ? ` else ${block(
            this.walk(n.false_block)
        )}` : ``)
    }
    walk_lambda(n: LambdaNode){
        return `[&](${n.function!.parameters.map(p => this.walk(p)).join(', ')})`
            + (n.function!.return_type ? ` -> ${this.walk_type(n.function!.return_type)}` : ``)
            + block(
                this.walk(n.function!.body!)
            )
    }
    walk_literal(n: LiteralNode){
        if(n.value == null) return `nullptr`
        return  JSON.stringify(n.value)
    }
    walk_match(n: MatchNode){
        return  n.branches.map(b => this.walk_match_branch(b)).join(' else ')
    }
    walk_match_branch(n: MatchBranchNode){
        let patterns = n.patterns.map(p => this.walk_pattern(p))
        return `if(${patterns.join('&&')}) ${block(
            this.walk(n.block!)
        )}`
    }
    walk_parameter(n: ParameterNode){
        return  this.walk_assignable(n)
    }
    walk_pass(n: PassNode){
        return ``
    }
    walk_pattern(n: PatternNode){
        return `PATTERN` //TODO:
    }
    walk_preload(n: PreloadNode){
        return `preload(${this.walk(n.path!)})` //TODO: resolved_path?
    }
    walk_return(n: ReturnNode){
        return `return` + (n.return_value ? ` ${this.walk(n.return_value!)}` : ``)
    }
    walk_self(n: SelfNode){
        return `this`
    }
    walk_signal(n: SignalNode){
        return `//signal ${this.walk_identifier_not_expr(n.identifier!)}(${n.parameters.map(p => this.walk(p)).join(', ')})` //TODO:
    }
    walk_subscript(n: SubscriptNode){
        
        let base_ns = this.corresp.get(n.base!)!
        this.uses.add(base_ns)
        
        let base_str = this.walk(n.base!)

        if(n.is_attribute){
            
            let delim = '.'
            let ns_types: NamespaceType[] = ['class', 'struct', 'enum', 'namespace']
            let is_ns = ns_types.includes(base_ns.get(n.attribute!.name)?.type!)
            if(is_ns || base_ns.type == 'enum') delim = '::'
            else if(base_ns.is_opaque) delim = '.'
            else if(base_ns.type == 'class') delim = '->'
            
            return `${base_str}${delim}${this.walk_identifier_not_expr(n.attribute!)}`
        } else {
            return `${base_str}[${this.walk(n.index!)}]`
        }
    }
    walk_suite(n: SuiteNode){
        return  n.statements.map(s => `${this.walk(s!)};`).join('\n') //TODO:
    }
    walk_ternary_op(n: TernaryOpNode){
        return `(${this.walk(n.condition!)}) ? (${this.walk(n.true_expr!)}) : (${this.walk(n.false_expr!)})`
    }
    walk_type_test(n: TypeTestNode){
        return `TYPE_TEST` //TODO:
    }
    walk_unary_op(n: UnaryOpNode){
        return `${un_op[n.operation]}${this.walk(n.operand!)}` //TODO: variant_op?
    }
    walk_variable(n: VariableNode){
        return this.walk_assignable(n)
    }
    walk_while(n: WhileNode){
        return `while(${this.walk(n.condition!)}) ${block(
            this.walk(n.loop!)
        )}`
    }
}

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
