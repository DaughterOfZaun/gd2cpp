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
import { bin_op, ClassRepr, get_class_name, get_parent_name, Namespace, NamespaceChain, un_op } from "./shared.mts";
import { block, Walker } from "./walker.mts";

export class WalkerHPP extends Walker {

    uses = new Set<ClassRepr>()
    refs = new Set<ClassRepr>()
    
    ns: Namespace
    chain: NamespaceChain
    constructor(ns: Namespace){
        super()
        this.ns = ns
        this.chain = new NamespaceChain([ ns ])
    }

    walk_assignable = (n: AssignableNode) => {
        let type = n.datatype_specifier
        let name = this.walk_identifier(n.identifier!)
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
    walk_binary_op = (n: BinaryOpNode) => `${this.walk(n.left_operand!)} ${bin_op[n.operation]} ${this.walk(n.right_operand!)}`
    walk_class = (n: ClassNode) => {
        let name = get_class_name(n)
        //let extnds = get_parent_name(n)
        let members = n.members.filter(m => 'type' in m)

        let new_ns = this.chain.last().get(name) as ClassRepr
        console.assert(!!new_ns)
        this.chain.push(new_ns!)
        let body = members.map(m => /*public*/ `${this.walk(m)};`).join('\n')
        this.chain.pop()

        let extnds = new_ns.parent!
        this.uses.add(extnds)

        return `class ${name} : public ${extnds.path} ` + block(
            `GDCLASS(${name}, ${extnds.path})\n` +

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

            body
        )
    }
    walk_constant = (n: ConstantNode) => `//const ${this.walk_assignable(n)}`
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
    walk_identifier = (n: IdentifierNode) => {
        if(['register', 'char', 'default'].includes(n.name)) return `$${n.name}`
        return n.name
    }
    walk_literal = (n: LiteralNode) => JSON.stringify(n.value)
    walk_parameter = (n: ParameterNode) => `${this.walk_assignable(n)}`
    walk_signal = (n: SignalNode) => `//signal ${this.walk_identifier(n.identifier!)}(${n.parameters.map(p => this.walk(p)).join(', ')})`
    walk_type = (n: TypeNode | undefined): string => {
        if (!n) return 'auto'
        if (!n.type_chain.length) return 'void'

        let path = n.type_chain.map(id => id.name)
        let path_str = path.join('::')

        if(['int', 'float', 'bool'].includes(path_str)) return path_str
        
        const opaque_types = [
            'Array', 'Callable', 'Dictionary', 'NodePath',
            'PackedByteArray', 'PackedColorArray', 'PackedFloat32Array', 'PackedFloat64Array',
            'PackedInt32Array', 'PackedInt64Array', 'PackedStringArray', 'PackedVector2Array',
            'PackedVector3Array', 'PackedVector4Array', 'RID', 'Signal',
            'StringName', 'String', 'Variant',
        ]

        let resolve = (path: string[]) => {
            let chain = this.chain.resolve(path) //|| this.chain.resolve(['godot', ...path])
            if(!chain) {
                console.warn(`Unresolved type path ${path.join('::')}`)
                //TODO: throw new Error(`Unresolved type path ${path.join('::')}`)
            }
            return chain
        }

        let type = resolve(path)
        
        if(!type) return path_str

        if(type.type === 'class' && !opaque_types.includes(type.name)){
            
            let ref_counted = this.ns/*.get(`godot`)!*/.get(`RefCounted`)! as ClassRepr
            let ref = this.ns/*.get(`godot`)!*/.get(`Ref`)! as ClassRepr

            for(let current: undefined | ClassRepr = type; current; current = current!.parent){
                if(current === ref_counted){
                    this.uses.add(ref)
                    this.uses.add(type)
                    return `${ref.path}<${type.path}>`
                }
            }
            if(type.file.startsWith('godot_cpp/')) this.uses.add(type) //HACK: 
            else this.refs.add(type)
            return `${type.path}*`
        }
        this.uses.add(type)
        return type.path
            //+ (n.container_types.length ? `<${n.container_types.map(this.walk_type).join(', ')}>` : ``)
    }
    walk_unary_op = (n: UnaryOpNode) => `${un_op[n.operation]}${this.walk(n.operand!)}`
    walk_variable = (n: VariableNode) => `${this.walk_assignable(n)}`

    walk_annotation = () => ``
}