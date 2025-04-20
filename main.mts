import fs from 'fs/promises'
import path from 'path'
import untyped_ast from "./ast.json"
const ast: ClassNode[] = untyped_ast as any

import { NodeType, Node, ClassNode, VariableNode, TypeNode, ArrayNode, AssignmentNode, AssignmentNodeOperation, AwaitNode, BinaryOpNode, CallNode, CastNode, DictionaryNode, GetNodeNode, IdentifierNode, LambdaNode, LiteralNode, PreloadNode, SelfNode, SubscriptNode, TypeTestNode, UnaryOpNode, BinaryOpNodeOpType, UnaryOpNodeOpType, AnnotationNode, AssertNode, BreakNode, BreakpointNode, ConstantNode, ContinueNode, EnumNode, ForNode, FunctionNode, IfNode, MatchNode, ParameterNode, PassNode, PatternNode, ReturnNode, SignalNode, SuiteNode, WhileNode, MatchBranchNode, TernaryOpNode, AssignableNode, Variant, ExpressionNode } from "./def.mjs"

const TAB = '   '
function tab(code: string): string {
    return code.split('\n').map(line => TAB + line).join('\n')
}

function walk_type(n: TypeNode|undefined): string {
    if(!n) return 'auto'
    if(!n.type_chain.length) return 'void'
    return n.type_chain.map(id => id.name).join('::')
        + (n.container_types.length ? `<${n.container_types.map(walk_type).join(', ')}>` : ``)
}

function walk_variant(v: Variant): string {
    return JSON.stringify(v) //TODO:
}

//TODO:
function walk_match_branch(n: MatchBranchNode, test: string): string {
    let patterns = n.patterns.map(p => walk_pattern(p, test))
    return `if(${patterns.join('&&')}){\n${tab(
        walk(n.block!)
    )}\n}`
}

function walk_pattern(n: PatternNode, test: string): string {
    return `PATTERN`
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
    [BinaryOpNodeOpType.CONTENT_TEST]: 'in', //TODO:
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

function walk_assignable(n: AssignableNode): string {
    return `${walk_type(n.datatype_specifier!)} ${n.identifier!.name}`
        + (n.initializer ? ` = ${walk(n.initializer)}` : ``)
}

function walk(node: Node): string {
    switch(node.type){
        case NodeType.NONE: {
            //let n = node as NoneNode
            return `NONE` //TODO:
        }
        case NodeType.ANNOTATION: {
            let n = node as AnnotationNode
            return `//${n.name}(${n.arguments.map(a => walk(a))})`
        }
        case NodeType.ARRAY: {
            let n = node as ArrayNode
            return `{${n.elements.map(e => walk(e)).join(', ')}}`
        }
        case NodeType.ASSERT: {
            let n = node as AssertNode
            return `assert(${walk(n.condition!)}`
                + (n.message ? `, ${walk(n.message!)}` : ``)
                + `)`
        }
        case NodeType.ASSIGNMENT: {
            let n = node as AssignmentNode
            return `${walk(n.assignee!)} ${assign_op[n.operation]}= ${walk(n.assigned_value!)}` //TODO: variant_op?
        }
        case NodeType.AWAIT: {
            let n = node as AwaitNode
            return `co_await ${walk(n.to_await!)}`
        }
        case NodeType.BINARY_OPERATOR: {
            let n = node as BinaryOpNode
            return `${walk(n.left_operand!)} ${bin_op[n.operation]} ${walk(n.right_operand!)}` //TODO: variant_op?
        }
        case NodeType.BREAK: {
            let n = node as BreakNode
            return `break`
        }
        case NodeType.BREAKPOINT: {
            let n = node as BreakpointNode
            return `breakpoint()`
        }
        case NodeType.CALL: {
            let n = node as CallNode
            return `${walk(n.callee!)}(${n.arguments.map(arg => walk(arg)).join(', ')})` //TODO: function_name? is_super? is_static?
        }
        case NodeType.CAST: {
            let n = node as CastNode
            return `(${walk_type(n.cast_type!)})${walk(n.operand!)}`
        }
        case NodeType.CLASS: {
            let n = node as ClassNode
            return `class ${n.fqcn} {\n${tab(
                n.members.filter(m => 'type' in m).map(m => `${walk(m)};`).join('\n')
            )}\n}`
        }
        case NodeType.CONSTANT: {
            let n = node as ConstantNode
            return `const ${walk_assignable(n)}`
        }
        case NodeType.CONTINUE: {
            let n = node as ContinueNode
            return `continue`
        }
        case NodeType.DICTIONARY: {
            let n = node as DictionaryNode
            return `{${
                n.elements.map(e => `{${walk(e.key!)}, ${walk(e.value!)}}`).join(', ')
            }}`
        }
        case NodeType.ENUM: {
            let n = node as EnumNode
            return `enum ${n.identifier!.name} {\n${tab(
                n.values.map(v => `${v.identifier!.name} = ${v.custom_value ? walk(v.custom_value) : v.value}`).join(',\n')
            )}\n}`
        }
        case NodeType.FOR: {
            let n = node as ForNode
            return `for(${walk_type(n.datatype_specifier!)} ${n.variable!.name} : ${walk(n.list!)}){\n${tab(
                walk(n.loop!)
            )}\n}`
        }
        case NodeType.FUNCTION: {
            let n = node as FunctionNode
            return `${walk_type(n.return_type!)} ${n.identifier!.name}(${n.parameters.map(p => walk(p)).join(', ')}){\n${tab(walk(n.body!))}\n}`
        }
        case NodeType.GET_NODE: {
            let n = node as GetNodeNode
            return `get_node("${n.full_path}")` //TODO: use_dollar?
        }
        case NodeType.IDENTIFIER: {
            let n = node as IdentifierNode
            return n.name
        }
        case NodeType.IF: {
            let n = node as IfNode
            return `if(${walk(n.condition!)}){\n${tab(
                walk(n.true_block!)
            )}\n}` + (n.false_block ? ` else {\n${tab(
                walk(n.false_block)
            )}\n}` : ``)
        }
        case NodeType.LAMBDA: {
            let n = node as LambdaNode
            return `[&](${n.function!.parameters.map(p => walk(p)).join(', ')})`
                + (n.function!.return_type ? ` -> ${walk_type(n.function!.return_type)}` : ``)
                + `{\n${tab(
                    walk(n.function!.body!)
                )}\n}`
        }
        case NodeType.LITERAL: {
            let n = node as LiteralNode
            return `${walk_variant(n.value)}`
        }
        case NodeType.MATCH: {
            let n = node as MatchNode
            let test = walk(n.test!)
            return n.branches.map(b => walk_match_branch(b, test)).join(' else ')
        }
        case NodeType.MATCH_BRANCH: {
            let n = node as MatchBranchNode
            return `MATCH_BRANCH` //TODO:
        }
        case NodeType.PARAMETER: {
            let n = node as ParameterNode
            return walk_assignable(n)
        }
        case NodeType.PASS: {
            let n = node as PassNode
            return ``
        }
        case NodeType.PATTERN: {
            let n = node as PatternNode
            return `PATTERN` //TODO:
        }
        case NodeType.PRELOAD: {
            let n = node as PreloadNode
            return `preload(${walk(n.path!)})` //TODO: resolved_path?
        }
        case NodeType.RETURN: {
            let n = node as ReturnNode
            return `return` + (n.void_return ? ` ${walk(n.return_value!)}` : ``)
        }
        case NodeType.SELF: {
            let n = node as SelfNode
            return `self`
        }
        case NodeType.SIGNAL: {
            let n = node as SignalNode
            return `//signal ${n.identifier!.name}(${n.parameters.map(p => walk(p)).join(', ')})` //TODO:
        }
        case NodeType.SUBSCRIPT: {
            let n = node as SubscriptNode
            return `${walk(n.base!)}${n.is_attribute ? `.${n.attribute!.name}` : `[${walk(n.index!)}]` }`
        }
        case NodeType.SUITE: {
            let n = node as SuiteNode
            return n.statements.map(s => `${walk(s!)};`).join('\n') //TODO:
        }
        case NodeType.TERNARY_OPERATOR: {
            let n = node as TernaryOpNode
            return `(${walk(n.condition!)}) ? (${walk(n.true_expr!)}) : (${walk(n.false_expr!)})`
        }
        case NodeType.TYPE: {
            let n = node as TypeNode
            return walk_type(n)
        }
        case NodeType.TYPE_TEST: {
            let n = node as TypeTestNode
            return `TYPE_TEST` //TODO:
        }
        case NodeType.UNARY_OPERATOR: {
            let n = node as UnaryOpNode
            return `${un_op[n.operation]}${walk(n.operand!)}` //TODO: variant_op?
        }
        case NodeType.VARIABLE: {
            let n = node as VariableNode
            return `${walk_assignable(n)}`
        }
        case NodeType.WHILE: {
            let n = node as WhileNode
            return `while(${walk(n.condition!)}){\n${tab(
                walk(n.loop!)
            )}\n}`
        }
    }
    return ``
}

await Promise.all(
    ast.map(
        async n => {
            let out_path = path.join('out', n.path)
            await fs.mkdir(path.dirname(out_path), { recursive: true })
            await fs.writeFile(out_path.replace('.gd', '.cpp'), walk(n))
        }
    )
)