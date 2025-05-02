import {
    AssignableNode, 
    BinaryOpNode, 
    ClassNode, ConstantNode, 
    EnumNode,
    FunctionNode,
    LiteralNode,
    NodeType,
    ParameterNode, 
    SignalNode,
    UnaryOpNode,
    VariableNode,
} from "./def.mts"
import { block } from "./walker.mts";
import { WalkerXPP, bin_op, un_op } from "./walker_xpp.mts"

export class WalkerHPP extends WalkerXPP {
    walk_constant = (n: ConstantNode) => `const ${this.walk_assignable(n)} = ${this.walk(n.initializer!)}`
    walk_parameter = (n: ParameterNode) => `${this.walk_assignable(n)}`
    walk_variable = (n: VariableNode) => `${this.walk_assignable(n)}`
    walk_assignable = (n: AssignableNode) => {
        let type = n.datatype_specifier
        let name = this.walk_identifier(n.identifier!)
        /*
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
        */
        return `${this.walk_type(type)} ${name}`
    }
    walk_class = (n: ClassNode) => {
        let members = n.members.filter(m => 'type' in m)

        let cls = this.corresp.get(n)!
        let extnds = cls.parent!
        this.uses.add(extnds)

        return `class ${cls.name} : public ${extnds.path} ` + block(
            `GDCLASS(${cls.name}, ${extnds.path})\n` +

            `protected:\n` +
            `static void _bind_methods();\n` +

            `public:\n` +

            members.filter(m => m.type === NodeType.CLASS).map(m => {
                let name = this.walk_identifier((m as ClassNode).identifier!)
                return /*public*/ `class ${name};\n`
            }).join('') +

            members.filter(m => m.type === NodeType.ENUM).map(m => {
                let name = this.walk_identifier((m as EnumNode).identifier!)
                return /*public*/ `enum class ${name};\n`
            }).join('') +

            members.map(m => /*public*/ `${this.walk(m)};`).join('\n')
        )
    }
    walk_enum = (n: EnumNode) =>
        `enum class ${this.walk_identifier(n.identifier!)} ${block(
            n.values.map(v => `${this.walk_identifier(v.identifier!)} = ${v.custom_value ? this.walk(v.custom_value) : v.value}`).join(',\n')
        )}`
    walk_function = (n: FunctionNode) => {
        let name = this.walk_identifier(n.identifier!)
        //let node = this.ns.get('godot')?.get('Node') as ClassRepr
        //let self = this.chain.last() as ClassRepr
        //let chain = []
        //for(let current = self; current; current = current.parent!)
        //    chain.push(current)
        return `${this.walk_type(n.return_type!)} ${name}(${n.parameters.map(p => this.walk(p)).join(', ')})`
        //+ ((name === '_ready' && chain.includes(node)) ? ' override' : '')
    }
    walk_signal = (n: SignalNode) => `//signal ${this.walk_identifier(n.identifier!)}(${n.parameters.map(p => this.walk(p)).join(', ')})`
    
    walk_annotation = () => ``
}