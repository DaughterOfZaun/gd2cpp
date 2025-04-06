import ast from "./ast.json"

import { NodeType, Node, ClassNode, VariableNode, TypeNode, ArrayNode, AssignmentNode, AssignmentNodeOperation, AwaitNode, BinaryOpNode, CallNode, CastNode, DictionaryNode, GetNodeNode, IdentifierNode, LambdaNode, LiteralNode, PreloadNode, SelfNode, SubscriptNode, TernaryOpNode, TypeTestNode, UnaryOpNode, BinaryOpNodeOpType, UnaryOpNodeOpType } from "./def.mjs"

let level = 0
const TAB = '   '
Object.defineProperty(global, 'inc', {
    get(): string {
        ++level; return ''
    }
})
Object.defineProperty(global, 'dec', {
    get(): string {
        --level; return ''
    }
})
function tab(code: string): string {
    return code.split('\n').map(line => TAB.repeat(level) + line).join('\n')
}
declare global {
    const inc: string
    const dec: string
}

function type(n: TypeNode): string {
    return n.type_chain.map(id => id.name).join('::') + (n.container_types.length ? `<${n.container_types.map(type).join(', ')}>` : ``)
}

const assign_op = {
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

const bin_op = {
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
    [BinaryOpNodeOpType.CONTENT_TEST]: '', //TODO:
    [BinaryOpNodeOpType.COMP_EQUAL]: '==',
    [BinaryOpNodeOpType.COMP_NOT_EQUAL]: '!=',
    [BinaryOpNodeOpType.COMP_LESS]: '<',
    [BinaryOpNodeOpType.COMP_LESS_EQUAL]: '<=',
    [BinaryOpNodeOpType.COMP_GREATER]: '>',
    [BinaryOpNodeOpType.COMP_GREATER_EQUAL]: '>=',
}

const un_op = {
    [UnaryOpNodeOpType.POSITIVE]: '+',
    [UnaryOpNodeOpType.NEGATIVE]: '-',
    [UnaryOpNodeOpType.COMPLEMENT]: '~',
    [UnaryOpNodeOpType.LOGIC_NOT]: '!',
}

function walk(node: Node): string {
    switch(node.type){
        case NodeType.CLASS: {
            let n = node as ClassNode
            return `class ${n.fqcn} {\n${inc}${
                n.members.filter(m => 'type' in m).map(m => `${tab(walk(m))};`).join('\n')
            }${dec}\n}`
        }
        case NodeType.VARIABLE: {
            let n = node as VariableNode
            return `${type(n.datatype_specifier!)} ${n.identifier!.name}${
                n.initializer ? ` = ${walk(n.initializer)}` : ``
            }`
        }
        case NodeType.ARRAY: {
            let n = node as ArrayNode
            return `{${n.elements.map(e => walk(e)).join(', ')}}`
        }
        case NodeType.ASSIGNMENT: {
            let n = node as AssignmentNode
            return `${walk(n.assignee!)} ${assign_op[n.operation]}= ${walk(n.assigned_value!)}` //TODO: variant_op?
        }
        case NodeType.AWAIT: {
            let n = node as AwaitNode
            return `await ${walk(n.to_await!)}`
        }
        case NodeType.BINARY_OPERATOR: {
            let n = node as BinaryOpNode
            return `${walk(n.left_operand!)} ${bin_op[n.operation]} ${walk(n.right_operand!)}` //TODO: variant_op?
        }
        case NodeType.CALL: {
            let n = node as CallNode
            return `${walk(n.callee!)}.${n.function_name}(${n.arguments.map(arg => walk(arg)).join(', ')})` //TODO: is_super? is_static?
        }
        case NodeType.CAST: {
            let n = node as CastNode
            return `(${type(n.cast_type!)})${walk(n.operand!)}`
        }
        case NodeType.DICTIONARY: {
            let n = node as DictionaryNode
            return `{${
                n.elements.map(e => `{${walk(e.key!)}, ${walk(e.value!)}}`).join(', ')
            }}`
        }
        case NodeType.GET_NODE: {
            let n = node as GetNodeNode
            return `get_node("${n.full_path}")` //TODO: use_dollar?
        }
        case NodeType.IDENTIFIER: {
            let n = node as IdentifierNode
            return n.name
        }
        case NodeType.LAMBDA: {
            let n = node as LambdaNode
            return `LAMBDA` //TODO:
        }
        case NodeType.LITERAL: {
            let n = node as LiteralNode
            return `LITERAL` //TODO:
        }
        case NodeType.PRELOAD: {
            let n = node as PreloadNode
            return `preload(${walk(n.path!)})` //TODO: resolved_path?
        }
        case NodeType.SELF: {
            let n = node as SelfNode
            return `self`
        }
        case NodeType.SUBSCRIPT: {
            let n = node as SubscriptNode
            return `${walk(n.base!)}${n.is_attribute ? `.${n.attribute!.name}` : `[${walk(n.index!)}]` }`
        }
        case NodeType.TERNARY_OPERATOR: {
            let n = node as TernaryOpNode
            return `(${walk(n.condition!)}) ? (${walk(n.true_expr!)}) : (${walk(n.false_expr!)})`
        }
        case NodeType.TYPE_TEST: {
            let n = node as TypeTestNode
            return `TYPE_TEST` //TODO:
        }
        case NodeType.UNARY_OPERATOR: {
            let n = node as UnaryOpNode
            return `${un_op[n.operation]}${walk(n.operand!)}` //TODO: variant_op?
        }
    }
    return ``
}

console.log(walk(ast[0] as ClassNode))