import {
    ClassNode,
    ConstantNode,
    FunctionNode,
    VariableNode
} from "./def.mts"
import type { Namespace } from "./shared.mts"
import { block } from "./walker.mts"
import { WalkerXPP } from "./walker_xpp.mts"

export class WalkerCPP extends WalkerXPP {

    current_class?: Namespace
    level = 0

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
        this.level++
        
        let ret = `${
            this.walk_type(n.return_type!)
        } ${
            this.current_class!.path
        }::${
            this.walk_identifier_not_expr(n.identifier!)
        }(${
            n.parameters.map(p => this.walk(p)).join(', ')
        })` + block(this.walk(n.body!))
        
        this.level--
        return ret
    }
    
    walk_enum = () => ``
    walk_variable = (n: VariableNode) => this.level ? super.walk_variable(n) : ``
    walk_annotation = () => ``
    walk_constant = (n: ConstantNode) => this.level ? super.walk_constant(n) : ``
    walk_signal = () => ``
}
