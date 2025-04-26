import path from "path"
import { AssignmentNodeOperation, BinaryOpNodeOpType, ClassNode, UnaryOpNodeOpType } from "./def.mts"

export type ClassReprType = 'class' | 'struct' | 'enum'
export class ClassRepr {
    type: ClassReprType
    path: string
    name?: string
    parent_name?: string
    parent?: ClassRepr
    builtin: boolean
    constructor(path: string, type: ClassReprType, name?: string, parent_name?: string, builtin = false){
        this.path = path
        this.type = type
        this.name = name
        this.parent_name = parent_name
        this.builtin = builtin
    }
}

export const get_class_name = (n: ClassNode) =>
    n.identifier?.name ?? (
        n.fqcn.endsWith('.gd') ?
        path.basename(n.fqcn, '.gd').replace(/^(\w)|_(\w)/g, (m, g1, g2) => (g1 || g2).toUpperCase()) :
        n.fqcn
    )

export const get_parent_name = (n: ClassNode) =>
    n.extends?.map(id => id.name).join('::') || 'RefCounted'

export const assign_op = {
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

export const bin_op = {
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

export const un_op = {
    [UnaryOpNodeOpType.POSITIVE]: '+',
    [UnaryOpNodeOpType.NEGATIVE]: '-',
    [UnaryOpNodeOpType.COMPLEMENT]: '~',
    [UnaryOpNodeOpType.LOGIC_NOT]: '!',
}
