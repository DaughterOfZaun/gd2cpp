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
    ParameterNode, PassNode, PatternNode, PreloadNode,
    ReturnNode,
    SelfNode, SignalNode, SubscriptNode, SuiteNode,
    TernaryOpNode, TypeNode, TypeTestNode,
    UnaryOpNode,
    VariableNode,
    WhileNode
} from "./def.mts"
import type { ClassRepr } from "./shared.mts"
import { block, Walker } from "./walker.mts"
import { WalkerXPP, assign_op, bin_op, un_op } from "./walker_xpp.mts"

export class WalkerCPP extends WalkerXPP {

    current_class?: ClassRepr

    walk_class(n: ClassNode): string {
        let members = n.members.filter(m => 'type' in m)

        let cls = this.corresp.get(n)!
        console.assert(!!cls)

        this.current_class = cls

        let body = ``
        body += `void ${cls.path}::_bind_methods() ${block(``)}\n`
        body += members.map(m => this.walk(m)).filter(s => !!s).map(s => `${s};\n`).join('')

        return body
    }
    walk_function = (n: FunctionNode) => {
        return `${
            this.walk_type(n.return_type!)
        } ${
            this.current_class!.path
        }::${
            this.walk_identifier(n.identifier!)
        }(${
            n.parameters.map(p => this.walk(p)).join(', ')
        })` + block(this.walk(n.body!))
    }
    
    walk_enum = () => ``
    walk_variable = () => ``
    walk_annotation = () => ``
    walk_constant = () => ``
    walk_signal = () => ``
}
