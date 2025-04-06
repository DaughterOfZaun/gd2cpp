import ast from "./ast.json"

import { NodeType, Node, ClassNode } from "./def"

let level = 0
const TAB = '   '
function inc(): string {
    return TAB.repeat(++level)
}
function dec(): string {
    return TAB.repeat(--level)
}

function walk(node: Node): String {
    switch(node.type){
        case NodeType.CLASS:
            let n = node as ClassNode
            return `class ${n.identifier!.name} {\n${inc()}${dec()}\n}`
            break;
    }
    return ``
}

console.log(walk(ast[0] as ClassNode))