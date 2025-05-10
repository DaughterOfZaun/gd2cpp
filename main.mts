import fs from 'fs/promises'
import path from 'path'

import untyped_ast from "./ast.json"
import { AssignableNode, ClassNode, ConstantNode, EnumNode, FunctionNode, Node, NodeType, ParameterNode, PatternNode, SignalNode, SuiteNode, TypeNode, VariableNode } from "./def.mjs"
const ast: ClassNode[] = untyped_ast as any

//import { WalkerCPP } from './walker_cpp.mts'
import { WalkerHPP } from './walker_hpp.mts'
import { get_class_name, get_parent_name, Namespace, CorrespMapType, type NamespaceType } from './shared.mts'
import { Walker } from './walker.mts'
import { WalkerCPP } from './walker_cpp.mts'

let types = new Namespace()

// REGISTER PRIMITIVES
const void_type = types.push_new(``, `primitive`, `void`, undefined, true)
const int_type = types.push_new(``, `primitive`, `int`, undefined, true)
const float_type = types.push_new(``, `primitive`, `float`, undefined, true)
const bool_type = types.push_new(``, `primitive`, `bool`, undefined, true)

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
        let parent = ns.resolve(path)
        if(!parent){
            //throw new Error(`Unresolved type path ${path.join('::')}`)
            console.warn(`Unresolved type path ${path.join('::')}`)
        }
        ns.parent = parent
    }
})

// SET FLAGS
let ref = types.get(`Ref`)!
let ref_counted = types.get(`RefCounted`)!
    ref_counted.is_ref_counted = true
for(let cls of all_classes){
    for(let cur = cls; cur; cur = cur.parent!){
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
                    case '': type = void_type; break
                    case 'int': type = int_type; break
                    case 'float': type = float_type; break
                    case 'bool': type = bool_type; break
                }
                if(!type){
                    type = chain.resolve(path)
                }
                if(!type) {
                    console.warn(`Unresolved type path ${path.join('::')}`)
                    //TODO: throw new Error(`Unresolved type path ${path.join('::')}`)
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

let block_id = 0
let variant_type = types.get('Variant')!

// REGISTER LOCALS
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
            case NodeType.FUNCTION: //TODO: Lambdas
            {
                let n = obj as FunctionNode
                let name = n.identifier!.name
                
                let ns = chain.push_new(``, 'method', name)
                chain.locals.set(name, ns)                
                chain = chain.push(ns)

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
                corresp.set(obj, chain)
                break
            }
            case NodeType.CONSTANT:
            case NodeType.VARIABLE:
            case NodeType.PARAMETER: {
                let n = obj as AssignableNode
                let name = n.identifier!.name
                let ns = corresp.get(n.datatype_specifier)!
                chain.locals.set(name, ns)
                break
            }
            case NodeType.PATTERN: {
                let n = obj as PatternNode
                let name = n.bind!.name
                let ns = variant_type
                chain.locals.set(name, ns)
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
        ast.map(n => corresp.get(n)!.toString())
        .map(path => `    GDREGISTER_RUNTIME_CLASS(${path});`).join('\n')
    )
    , 'utf8'
)

await Promise.all([
    ast.map(async n => {
        const walker_cpp = new WalkerCPP(corresp, { ref })
        const body = walker_cpp.walk(n).replaceAll('godot::', '')

        let cls_name = get_class_name(n)

        let out_path_cpp = path.join('src', n.path.replace('.gd', '.cpp'))
        let out_path_hpp = out_path_cpp.replace('src/', '').replace('.cpp', '.hpp')
        let out_path_dir = path.dirname(out_path_cpp)
        await fs.mkdir(out_path_dir, { recursive: true })
        await fs.writeFile(
            out_path_cpp,
            `#include "${out_path_hpp}"\n` +
            `using namespace godot;\n` +
            body, 'utf8'
        )
    }),
    ast.map(
        async n => {
            const walker_hpp = new WalkerHPP(corresp, { ref })
            const body = walker_hpp.walk(n).replaceAll('godot::', '')

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