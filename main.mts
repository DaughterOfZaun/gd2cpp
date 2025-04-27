import fs from 'fs/promises'
import path from 'path'

import untyped_ast from "./ast.json"
import { ClassNode, EnumNode, VariableNode } from "./def.mjs"
const ast: ClassNode[] = untyped_ast as any

//import { WalkerCPP } from './walker_cpp.mts'
import { WalkerHPP } from './walker_hpp.mts'
import { ClassRepr, get_class_name, get_parent_name, Namespace, NamespaceChain, type NamespaceType } from './shared.mts'
import { block, Walker } from './walker.mts'

let types = new Namespace(``, ``)
let types_save = () => fs.writeFile('types.json', JSON.stringify(types, (k, v) => (v instanceof Map) ? Object.fromEntries(v.entries()) : v, 4))

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
                        chain.push_new(file, ns_type, name, path, extnds)
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

//await types_save(); process.exit()

types.walk((chain, ns) => {
    if(ns instanceof ClassRepr && ns.parent_path){
        let path = ns.parent_path.split('::')
        let parent = chain.resolve(path) ?? chain.resolve(['godot', ...path])
        if(!parent) throw new Error(`Unresolved type path ${path.join('::')}`)
        ns.parent = parent
    }
})

async function Promise_waterfall<T>(promises: Promise<T>[]){
    for(let promise of promises)
        await promise
}
/*
let class_names = ast.map(n => get_class_name(n))
await fs.writeFile(
    'src/register_types.cpp',
    (await fs.readFile('src/register_types.cpp', 'utf8'))
    .replace(
        /(?<=\/\*BEGIN HEADERS\*\/\n)((?:.|\n)*?)(?=\n\s*\/\*END HEADERS\*\/)/,
        class_names.map(name => `class ${name};`).join('\n')
    )
    .replace(
        /(?<=\/\*BEGIN CLASSES\*\/\n)((?:.|\n)*?)(?=\n\s*\/\*END CLASSES\*\/)/,
        class_names.map(name => `    GDREGISTER_CLASS(${name});`).join('\n')
    )
    , 'utf8'
)
*/

await Promise.all([
    ast.map(async n => {
        let out_path_cpp = path.join('src', n.path.replace('.gd', '.cpp'))
        let path_hpp = out_path_cpp.replace('src/', '').replace('.cpp', '.hpp')
        let out_path_dir = path.dirname(out_path_cpp)
        await fs.mkdir(out_path_dir, { recursive: true })
        await fs.writeFile(
            out_path_cpp,
            `#include "${path_hpp}"\n`
            , 'utf8'
        )
    })
].flat())
process.exit()

await Promise_waterfall([
    /*
    await fs.writeFile(
        'src/everything.hpp',
        '#pragma once\n'
        + '#ifndef EVERYTHING\n'
        + '#define EVERYTHING\n'
        + [].map(path => `#include <${path}> // IWYU pragma: export\n`).join('')
        + `using namespace godot;\n`
        //+ ast.map(n => `#include "${n.path.replace('.gd', '.hpp').replace(/^\//, '')}"\n`).join('')
        + '#endif // EVERYTHING\n'
        , 'utf8'
    ),
    */
    ast.map(
        async n => {
            //const walker_cpp = new WalkerCPP()
            const walker_hpp = new WalkerHPP(types)

            const body = walker_hpp.walk(n)

            //let name = 'EXAMPLE_' + get_class_name(n).replaceAll('::', '_').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()
            let out_path = path.join('src', n.path.replace('.gd', '.hpp'))
            let out_path_dir = path.dirname(out_path)
            await fs.mkdir(out_path_dir, { recursive: true })
            await fs.writeFile(
                out_path,
                '#pragma once\n'
                //+ `#ifndef ${name}\n`
                //+ `#define ${name}\n`
                //+ `#include "${n.path.replace(/^\/|\/[^/]*$/g, '').replace(/[^/]+/g, '..') + '/' + 'everything.hpp'}"\n`
                
                + walker_hpp.uses.values()
                    .filter(cls => cls.path.startsWith('godot::'))
                    .map(cls => {
                        return `#include <${cls.file}>\n`
                    })
                    .reduce((s, v) => s.add(v), new Set<string>()).values()
                    .toArray().toSorted().join('')
                
                + `namespace godot ` + block(
                    walker_hpp.refs.values()
                        .filter(cls => cls.path.startsWith('godot::'))
                        .map(cls => `class ${cls.name};`)
                        .toArray().join('\n')
                ) + `\n`

                + walker_hpp.uses.values()
                    .filter(cls => !cls.path.startsWith('godot::'))
                    .map(cls => {
                        let inc_path = path.join('src', cls.file)
                        if(inc_path == out_path) return `` // Don't include self
                        return `#include "${path.relative(out_path_dir, inc_path)}"\n`
                    })
                    .reduce((s, v) => s.add(v), new Set<string>()).values()
                    .toArray().toSorted().join('')
                
                + walker_hpp.refs.values()
                    .filter(cls => !cls.path.startsWith('godot::'))
                    .map(cls => `class ${cls.name};\n`)
                    .toArray().join('')
                
                //+ ((walker_hpp.uses.values().some(v => builtin_class_map.has(v))) ? `using namespace godot;\n` : ``)
                + `${body};\n`
                //+ `#endif // ${name}\n`
            )
        }
    ),
   /*
    ast.map(
        async n => {
            //const walker_cpp = new WalkerCPP()
            const walker_hpp = new WalkerHPP()
            walker_hpp.builtin_types = new Set(builtin_class_map.keys())

            const body = walker_hpp.walk(n)

            let path_wo_ext = n.path.replace('.gd', '')
            let name = path.basename(path_wo_ext)
            let out_path_cpp = path.join('src', path_wo_ext + '.cpp')
            let out_path_dir = path.dirname(out_path_cpp)
            await fs.mkdir(out_path_dir, { recursive: true })
            await fs.writeFile(
                out_path_cpp,
                `#include "${name + '.hpp'}"\n` +
                `#if INTERFACE\n` +
                `${body};\n` +
                `#endif // INTERFACE\n`
            )
        }
    )
    */
].flat())