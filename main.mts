import fs from 'fs/promises'
import path from 'path'

import untyped_ast from "./ast.json"
import { ArrayNode, AssignableNode, AssignmentNode, AwaitNode, BinaryOpNode, CallNode, CastNode, ClassNode, ConstantNode, DictionaryNode, EnumNode, ForNode, FunctionNode, GetNodeNode, IdentifierNode, LambdaNode, LiteralNode, Node, NodeType, ParameterNode, PatternNode, PreloadNode, SelfNode, SignalNode, SubscriptNode, SuiteNode, TernaryOpNode, TypeNode, TypeTestNode, UnaryOpNode, VariableNode } from "./def.mjs"
const ast: ClassNode[] = untyped_ast as any

//import { WalkerCPP } from './walker_cpp.mts'
import { WalkerHPP } from './walker_hpp.mts'
import { get_class_name, get_parent_name, Namespace, CorrespMapType, type NamespaceType } from './shared.mts'
import { Walker } from './walker.mts'
import { WalkerCPP } from './walker_cpp.mts'
import { ExprTypeResolver, type CachedTypes } from './walker_expr_type_resolver.mts'

let types = new Namespace()
let types_save = () => fs.writeFile('types.json', JSON.stringify(types, (k, v) => (v instanceof Map) ? Object.fromEntries(v.entries()) : v, 4))

const opaque_types = [
    'Array', 'Callable', 'Dictionary', 'NodePath',
    'PackedByteArray', 'PackedColorArray', 'PackedFloat32Array', 'PackedFloat64Array',
    'PackedInt32Array', 'PackedInt64Array', 'PackedStringArray', 'PackedVector2Array',
    'PackedVector3Array', 'PackedVector4Array', 'RID', 'Signal',
    'StringName', 'String', 'Variant',
]

// REGISTER BUILTINS
await Promise.all(
    [
        'godot-cpp/gdextension',
        'godot-cpp/include',
        'godot-cpp/gen/include'
    ]
    .map(async include_path => {
        await Promise.all(
            (await fs.readdir(include_path, { recursive: true }))
            .filter(file => file.endsWith('.hpp'))
            .map(async file => {
                let level = 0
                let chain = types
                let levels = []
                let content = await fs.readFile(`${include_path}/${file}`, 'utf8')
                let matches = content.matchAll(/(namespace|class|struct|enum)(?: \[\[nodiscard\]\])?(?: (\w+))(?: : public (\w+))?(?: \{)|(\{)|(\})/g)
                for(let [_, type, name, extnds, opening, closing] of matches){
                    let ns_type = type as NamespaceType
                    if(name){
                        chain = chain.push_new(file, ns_type, name, extnds, opaque_types.includes(name))
                        levels.push(level++)
                    } else if(opening) level++
                    else if(closing && --level === levels.at(-1)){
                        levels.pop()
                        chain = chain.pop()!
                    }
                }
            })
        )
    })
)

// USING NAMESPACE GODOT
types = types.get('godot')!
//types.extnds = types.get('godot')

// CACHE TYPES & REGISTER PRIMITIVES
let cached_types: CachedTypes = {
    
    //variant: types.get('Variant')!,
    array: types.get('Array')!,
    dictionary: types.get('Dictionary')!,
    node: types.get('Node')!,
    string: types.get('String')!,
    ref: types.get(`Ref`)!,
    ref_counted: types.get(`RefCounted`)!,
    callable: types.get(`Callable`)!,
    signal: types.get(`Signal`)!,

    auto: types.push_new(``, `primitive`, `auto`, undefined, false),
    //null: types.push_new(``, `primitive`, `null`, undefined, false),

    void: types.push_new(``, `primitive`, `void`, undefined, true),
    int: types.push_new(``, `primitive`, `int`, undefined, true),
    float: types.push_new(``, `primitive`, `float`, undefined, true),
    bool: types.push_new(``, `primitive`, `bool`, undefined, true),
}

let corresp = new CorrespMapType()
let chain = types

// REGISTER EXTERNALS
for(let class_node of ast){
    let file = class_node.path.replace(/^\//, '').replace('.gd', '.hpp')
    let chain = types
    travel(class_node, obj => {
        if('type' in obj)
        switch(obj.type as NodeType){
            case NodeType.CLASS: {
                let n = obj as ClassNode
                let name = get_class_name(n)
                let extnds = get_parent_name(n)
                chain = chain.push_new(file, 'class', name, extnds)
                corresp.set(n, chain.last())
                break
            }
            case NodeType.ENUM: {
                let n = obj as EnumNode
                let name = n.identifier!.name
                chain = chain.push_new(file, 'enum', name, undefined, true)
                corresp.set(n, chain.last())
                break
            }
        }
    }, obj => {
        if('type' in obj)
        switch(obj.type as NodeType){
            case NodeType.CLASS:
            case NodeType.ENUM:
            chain = chain.pop()!
        }
    })
}

//await types_save(); //process.exit()

// RESOLVE EXTENDS
let all_classes: Namespace[] = []
types.walk(ns => {
    if(ns.type === 'class'){
        all_classes.push(ns)
    }
    if(ns.extnds_path){
        let path = ns.extnds_path.split('::')
        ns.extnds = ns.resolve(path)
    }
})

// SET FLAGS
cached_types.ref_counted.is_ref_counted = true
for(let cls of all_classes){
    for(let cur = cls; cur; cur = cur.extnds!){
        if(cur.is_ref_counted){
            cls.is_ref_counted = true
            break
        }
    }
}

function travel(obj: any, cb_enter: (obj: any) => void, cb_exit: (obj: any) => void){
    if(typeof obj === 'object' && obj != null){
        cb_enter(obj)
        for(let v of Object.values(obj))
            travel(v, cb_enter, cb_exit)
        cb_exit(obj)
    } else if(Array.isArray(obj)){
        for(let v of obj)
            travel(v, cb_enter, cb_exit)
    }
}

// RESOLVE TYPE NODES
chain = types
travel(ast,
    (obj) => {
        if('type' in obj)
        switch(obj.type as NodeType){
            case NodeType.CLASS:
            case NodeType.ENUM:
            {
                let ns = corresp.get(obj)!
                chain = chain.push(ns)
                break
            }
            case NodeType.TYPE: {
                let n = obj as TypeNode

                let type: Namespace | undefined
                let path = n.type_chain.map(id => id.name)
                switch(path.join('::')){
                    case '': type = cached_types.void; break
                    case 'int': type = cached_types.int; break
                    case 'float': type = cached_types.float; break
                    case 'bool': type = cached_types.bool; break
                }
                if(!type){
                    type = chain.resolve(path)
                }
                corresp.set(n, type!)
                
                break
            }
        }
    },
    (obj) => {
        if('type' in obj)
        switch(obj.type as NodeType){
            case NodeType.CLASS:
            case NodeType.ENUM:
                chain = chain.pop()!
                break
        }
    }
)

// REGISTER LOCALS
let block_id = 0
chain = types
travel(ast,
    (obj) => {
        if('type' in obj)
        switch(obj.type as NodeType){
            case NodeType.CLASS:
            case NodeType.ENUM:
            {
                let ns = corresp.get(obj)!
                chain = chain.push(ns)
                if(obj.type == NodeType.ENUM)
                {
                    let n = obj as EnumNode
                    for(let v of n.values)
                        ns.locals.set(v.identifier!.name, cached_types.int)
                }
                break
            }
            case NodeType.FUNCTION: //TODO: Lambdas
            {
                let n = obj as FunctionNode
                let name = n.identifier?.name || `#${block_id++}`
                
                //let ns = chain.push_new(``, `block`, `#${block_id++}`)
                let ns = chain.push_new(``, 'method', name)
                ns.returns = corresp.get(n.return_type!)
                chain = chain.push(ns)
                
                chain.locals.set(name, cached_types.callable)
                
                corresp.set(obj, chain)
                break;
            }
            case NodeType.IF:
            case NodeType.FOR:
            case NodeType.WHILE:
            case NodeType.MATCH_BRANCH:
            //case NodeType.SUITE:
            {
                chain = chain.push_new(``, 'block', `#${block_id++}`)
                if(obj.type == NodeType.FOR){
                    let n = obj as ForNode
                    let name = n.variable!.name
                    let ns = cached_types.auto
                    if(n.datatype_specifier)
                        ns = corresp.get(n.datatype_specifier)!
                    chain.locals.set(name, ns)
                }
                corresp.set(obj, chain)
                break
            }
            case NodeType.CONSTANT:
            case NodeType.VARIABLE:
            case NodeType.PARAMETER: {
                let n = obj as AssignableNode
                let name = n.identifier!.name
                let ns = cached_types.auto
                if(n.datatype_specifier)
                    ns = corresp.get(n.datatype_specifier)!
                chain.locals.set(name, ns)
                break
            }
            case NodeType.PATTERN: {
                let n = obj as PatternNode
                if(n.bind){
                    let name = n.bind!.name
                    let ns = cached_types.auto
                    chain.locals.set(name, ns)
                }
            }
        }
    },
    (obj) => {
        if('type' in obj)
        switch(obj.type as NodeType){
            case NodeType.CLASS:
            case NodeType.ENUM:
            case NodeType.FOR:
            case NodeType.FUNCTION:
            case NodeType.IF:
            case NodeType.MATCH_BRANCH:
            //case NodeType.SUITE:
            case NodeType.WHILE:
                chain = chain.pop()!
                break
        }
    }
)

// RESOLVE EXPRESSION TYPES
let expr_type_resolver = new ExprTypeResolver(corresp, cached_types)
let current_class: Namespace
chain = types
travel(ast,
    (obj) => {
        if('type' in obj)
        switch(obj.type as NodeType){
            case NodeType.CLASS:
            case NodeType.ENUM:
            case NodeType.IF:
            case NodeType.FOR:
            case NodeType.WHILE:
            case NodeType.FUNCTION:
            case NodeType.MATCH_BRANCH:
            //case NodeType.SUITE:
            {
                let ns = corresp.get(obj)!
                if(obj.type == NodeType.CLASS){
                    current_class = ns
                }
                chain = chain.push(ns)
                break
            }
            //case NodeType.ARRAY:
            //case NodeType.ASSIGNMENT:
            //case NodeType.AWAIT:
            //case NodeType.BINARY_OPERATOR:
            //case NodeType.CALL:
            //case NodeType.CAST:
            //case NodeType.DICTIONARY:
            //case NodeType.GET_NODE:
            //case NodeType.IDENTIFIER:
            //case NodeType.LAMBDA:
            //case NodeType.LITERAL:
            //case NodeType.PRELOAD:
            //case NodeType.SELF:
            case NodeType.SUBSCRIPT:
            //case NodeType.TERNARY_OPERATOR:
            //case NodeType.TYPE_TEST:
            //case NodeType.UNARY_OPERATOR:
            {
                expr_type_resolver.current_ns = chain
                expr_type_resolver.current_class = current_class
                expr_type_resolver.walk(obj)
                break
            }
        }
    },
    (obj) => {
        if('type' in obj)
        switch(obj.type as NodeType){
            case NodeType.CLASS:
            case NodeType.ENUM:
            case NodeType.IF:
            case NodeType.FOR:
            case NodeType.WHILE:
            case NodeType.FUNCTION:
            case NodeType.MATCH_BRANCH:
            //case NodeType.SUITE:
                chain = chain.pop()!
                break
        }
    }
)

async function Promise_waterfall<T>(promises: Promise<T>[]){
    for(let promise of promises)
        await promise
}

let class_names = 
await fs.writeFile(
    'src/register_types.cpp',
    (await fs.readFile('src/register_types.cpp', 'utf8'))
    .replace(
        /(?<=\/\*BEGIN HEADERS\*\/\s+)((?:.|\n)*?)(?=\s+\/\*END HEADERS\*\/)/,
        ast.map(n => n.path.replace(/^\//, '').replace('.gd', '.hpp'))
        .map(file => `#include "${file}"`).join('\n')
    )
    .replace(
        /(?<=\/\*BEGIN CLASSES\*\/\s+)((?:.|\n)*?)(?=\s+\/\*END CLASSES\*\/)/,
        ast.map(n => corresp.get(n)!.path)
        .map(path => `    GDREGISTER_RUNTIME_CLASS(${path});`).join('\n')
    )
    , 'utf8'
)

await Promise.all([
    ast.map(async n => {
        const walker_cpp = new WalkerCPP(corresp, cached_types)
        const body = walker_cpp.walk(n)//.replaceAll('godot::', '')

        let cls_name = get_class_name(n)

        let out_path_cpp = path.join('src', n.path.replace('.gd', '.cpp'))
        let out_path_hpp = out_path_cpp.replace('src/', '').replace('.cpp', '.hpp')
        let out_path_dir = path.dirname(out_path_cpp)
        await fs.mkdir(out_path_dir, { recursive: true })
        await fs.writeFile(
            out_path_cpp,
            walker_cpp.gen_uses(out_path_hpp, out_path_dir)
            + `#include "${out_path_hpp}"\n`
            + `namespace godot {\n`
            + walker_cpp.gen_refs(cls_name)
            + body
            + '} // namespace godot\n'
            , 'utf8'
        )
    }),
    ast.map(
        async n => {
            const walker_hpp = new WalkerHPP(corresp, cached_types)
            const body = walker_hpp.walk(n)//.replaceAll('godot::', '')

            let cls_name = get_class_name(n)

            //let def_name = 'EXAMPLE_' + get_class_name(n).replaceAll('::', '_').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()
            let out_path_hpp = path.join('src', n.path.replace('.gd', '.hpp'))
            let out_path_dir = path.dirname(out_path_hpp)
            await fs.mkdir(out_path_dir, { recursive: true })
            await fs.writeFile(
                out_path_hpp,
                '#pragma once\n'
                //+ `#ifndef ${def_name}\n`
                //+ `#define ${def_name}\n`
                
                + walker_hpp.gen_uses(out_path_hpp, out_path_dir)
                + `namespace godot {\n`
                + walker_hpp.gen_refs(cls_name)
                + `${body};\n`
                + '} // namespace godot\n'
                
                //+ `#endif // ${def_name}\n`
            )
        }
    ),
].flat())