import fs from 'fs/promises'
import path from 'path'

import untyped_ast from "./ast.json"
import { ClassNode, EnumNode, Node, NodeType, TypeNode } from "./def.mjs"
const ast: ClassNode[] = untyped_ast as any

//import { WalkerCPP } from './walker_cpp.mts'
import { WalkerHPP } from './walker_hpp.mts'
import { ClassRepr, get_class_name, get_parent_name, Namespace, NamespaceChain, CorrespMapType, type NamespaceType } from './shared.mts'
import { Walker } from './walker.mts'
import { WalkerCPP } from './walker_cpp.mts'

let types = new Namespace(``, ``)
let types_save = () => fs.writeFile('types.json', JSON.stringify(types, (k, v) => (v instanceof Map) ? Object.fromEntries(v.entries()) : v, 4))

const opaque_types = [
    'Array', 'Callable', 'Dictionary', 'NodePath',
    'PackedByteArray', 'PackedColorArray', 'PackedFloat32Array', 'PackedFloat64Array',
    'PackedInt32Array', 'PackedInt64Array', 'PackedStringArray', 'PackedVector2Array',
    'PackedVector3Array', 'PackedVector4Array', 'RID', 'Signal',
    'StringName', 'String', 'Variant',
]

//if(await fs.exists('class_map.json')){
//    class_map = new Map(JSON.parse(await fs.readFile('class_map.json', 'utf8')))
//} else
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
                let chain = new NamespaceChain([ types ])
                let levels = []
                let content = await fs.readFile(`${include_path}/${file}`, 'utf8')
                let matches = content.matchAll(/(namespace|class|struct|enum)(?: \[\[nodiscard\]\])?(?: (\w+))(?: : public (\w+))?(?: \{)|(\{)|(\})/g)
                for(let [_, type, name, extnds, opening, closing] of matches){
                    let ns_type = type as NamespaceType
                    let path = chain.toString()
                    if(name){
                        chain.push_new(file, ns_type, name, path, extnds, opaque_types.includes(name))
                        levels.push(level++)
                    } else if(opening) level++
                    else if(closing && --level === levels.at(-1)){
                        levels.pop()
                        chain.pop()
                    }
                }
            })
        )
    })
)

types = types.get('godot')!

for(let n of ast){
    let file = n.path.replace(/^\//, '').replace('.gd', '.hpp')
    let chain = new NamespaceChain([ types ])
    let registrator = new (class Registrator extends Walker {
        walk_class(n: ClassNode): string {
            let name = get_class_name(n)
            let extnds = get_parent_name(n)
            let path = chain.toString()

            chain.push_new(file, 'class', name, path, extnds)
            for(let member of n.members)
                if('type' in member)
                    this.walk(member)
            chain.pop()
            
            return ``
        }
        walk_enum(n: EnumNode): string {
            let name = n.identifier!.name
            let path = chain.toString()
            chain.push_new(file, 'enum', name, path)
            chain.pop()
            return ``
        }
        walk_variable = () => ``
        walk_function = () => ``
        walk_annotation = () => ``
        walk_constant = () => ``
        walk_signal = () => ``
    })()
    registrator.walk(n)
}

await types_save(); //process.exit()

let all_classes: ClassRepr[] = []
types.walk((chain, ns) => {
    if(ns instanceof ClassRepr && ns.type === 'class'){
        all_classes.push(ns)
    }
    if(ns instanceof ClassRepr && ns.parent_path){
        let path = ns.parent_path.split('::')
        let parent = chain.resolve(path)
        if(!parent){
            //throw new Error(`Unresolved type path ${path.join('::')}`)
            console.warn(`Unresolved type path ${path.join('::')}`)
        }
        ns.parent = parent
    }
})

let ref = types.get(`Ref`)! as ClassRepr
let ref_counted = types.get(`RefCounted`)! as ClassRepr
    ref_counted.ref_counted = true
for(let cls of all_classes){
    for(let cur = cls; cur; cur = cur.parent!){
        if(cur.ref_counted){
            cls.ref_counted = true
            break
        }
    }
}

let corresp = new CorrespMapType() 
;(() => {
    let chain = new NamespaceChain([ types ])
    ;(function travel(obj: any, cb_enter: (obj: any) => void, cb_exit: (obj: any) => void){
        if(typeof obj === 'object' && obj != null){
            cb_enter(obj)
            for(let v of Object.values(obj))
                travel(v, cb_enter, cb_exit)
            cb_exit(obj)
        } else if(Array.isArray(obj)){
            for(let v of obj)
                travel(v, cb_enter, cb_exit)
        }
    })(ast,
    (obj) => {
        if('type' in obj)
        switch(obj.type as NodeType){
            case NodeType.CLASS: {
                let n = obj as ClassNode
                let name = get_class_name(n)
                let ns = chain.last().get(name)!
                corresp.set(n, ns as ClassRepr)
                chain.push(ns)
                break
            }
            case NodeType.ENUM: {
                let n = obj as EnumNode
                let name = n.identifier!.name
                let ns = chain.last().get(name)!
                corresp.set(n, ns as ClassRepr)
                chain.push(ns)
                break
            }
            case NodeType.TYPE: {
                let n = obj as TypeNode

                let path = n.type_chain.map(id => id.name)
                if(['', 'int', 'float', 'bool'].includes(path.join('::'))) break
                
                let type = chain.resolve(path)
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
                chain.pop()
                break
        }
    })
})()

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