type Pair<K,V> = { Item1: K, Item2: V }

export enum VariantType {
    NIL,

    // atomic types
    BOOL,
    INT,
    FLOAT,
    STRING,

    // math types
    VECTOR2,
    VECTOR2I,
    RECT2,
    RECT2I,
    VECTOR3,
    VECTOR3I,
    TRANSFORM2D,
    VECTOR4,
    VECTOR4I,
    PLANE,
    QUATERNION,
    AABB,
    BASIS,
    TRANSFORM3D,
    PROJECTION,

    // misc types
    COLOR,
    STRING_NAME,
    NODE_PATH,
    RID,
    OBJECT,
    CALLABLE,
    SIGNAL,
    DICTIONARY,
    ARRAY,

    // typed arrays
    PACKED_BYTE_ARRAY,
    PACKED_INT32_ARRAY,
    PACKED_INT64_ARRAY,
    PACKED_FLOAT32_ARRAY,
    PACKED_FLOAT64_ARRAY,
    PACKED_STRING_ARRAY,
    PACKED_VECTOR2_ARRAY,
    PACKED_VECTOR3_ARRAY,
    PACKED_COLOR_ARRAY,
    PACKED_VECTOR4_ARRAY,

    MAX,
}
export enum VariantOperator {
    //comparison
    EQUAL,
    NOT_EQUAL,
    LESS,
    LESS_EQUAL,
    GREATER,
    GREATER_EQUAL,

    //mathematic
    ADD,
    SUBTRACT,
    MULTIPLY,
    DIVIDE,
    NEGATE,
    POSITIVE,
    MODULE,
    POWER,

    //bitwise
    SHIFT_LEFT,
    SHIFT_RIGHT,
    BIT_AND,
    BIT_OR,
    BIT_XOR,
    BIT_NEGATE,

    //logic
    AND,
    OR,
    XOR,
    NOT,

    //containment
    IN,
    MAX,
}
export class Variant {}

export class MethodInfo {}
export class PropertyInfo {}
export class AnnotationInfo {}

export enum DataTypeKind {
    BUILTIN,
    NATIVE,
    SCRIPT,
    CLASS,
    ENUM,
    VARIANT,
    RESOLVING,
    UNRESOLVED,
};
export enum DataTypeTypeSource {
    UNDETECTED,
    INFERRED,
    ANNOTATED_EXPLICIT,
    ANNOTATED_INFERRED,
};
export class DataType {
    container_element_types!: Array<DataType>;
    kind: DataTypeKind = DataTypeKind.UNRESOLVED;
    type_source: DataTypeTypeSource = DataTypeTypeSource.UNDETECTED;
    is_constant: boolean = false;
    is_read_only: boolean = false;
    is_meta_type: boolean = false;
    is_pseudo_type: boolean = false;
    is_coroutine: boolean = false;
    builtin_type: VariantType = VariantType.NIL;
    native_type!: string;
    enum_type!: string;
    //script_type: Ref<Script>;
    script_path!: string;
    //class_type?: ClassNode = undefined;
    method_info!: MethodInfo;
    enum_values!: Record<string, number>;
};

export class ClassDocData {
    brief!: string;
    description!: string;
    tutorials!: Array<Pair<string, string>>;
    is_deprecated: boolean = false;
    deprecated_message!: string;
    is_experimental: boolean = false;
    experimental_message!: string;
};
export class MemberDocData {
    description!: string;
    is_deprecated: boolean = false;
    deprecated_message!: string;
    is_experimental: boolean = false;
    experimental_message!: string;
};

export enum NodeType {
    NONE,
    ANNOTATION,
    ARRAY,
    ASSERT,
    ASSIGNMENT,
    AWAIT,
    BINARY_OPERATOR,
    BREAK,
    BREAKPOINT,
    CALL,
    CAST,
    CLASS,
    CONSTANT,
    CONTINUE,
    DICTIONARY,
    ENUM,
    FOR,
    FUNCTION,
    GET_NODE,
    IDENTIFIER,
    IF,
    LAMBDA,
    LITERAL,
    MATCH,
    MATCH_BRANCH,
    PARAMETER,
    PASS,
    PATTERN,
    PRELOAD,
    RETURN,
    SELF,
    SIGNAL,
    SUBSCRIPT,
    SUITE,
    TERNARY_OPERATOR,
    TYPE,
    TYPE_TEST,
    UNARY_OPERATOR,
    VARIABLE,
    WHILE,
};
export class Node {
    type: NodeType = NodeType.NONE;
    start_line: number = 0
    end_line: number = 0;
    start_column: number = 0
    end_column: number = 0;
    leftmost_column: number = 0
    rightmost_column: number = 0;
    next?: Node = undefined;
    annotations!: Array<AnnotationNode>;
    datatype!: DataType;
};
export class ExpressionNode extends Node {
    reduced: boolean = false;
    is_constant: boolean = false;
    reduced_value?: null|Variant = undefined; //?
};
export class AnnotationNode extends Node {
    name!: string;
    arguments!: Array<ExpressionNode>;
    resolved_arguments!: Array<Variant>;
    info?: AnnotationInfo = undefined;
    export_info!: PropertyInfo;
    is_resolved: boolean = false;
    is_applied: boolean = false;
};
export class ArrayNode extends ExpressionNode {
    elements!: Array<ExpressionNode>;
};
export class AssertNode extends Node {
    condition?: ExpressionNode = undefined;
    message?: ExpressionNode = undefined;
};
export class AssignableNode extends Node {
    identifier?: IdentifierNode = undefined;
    initializer?: ExpressionNode = undefined;
    datatype_specifier?: TypeNode = undefined;
    infer_datatype: boolean = false;
    use_conversion_assign: boolean = false;
    usages: number = 0;
};
export enum AssignmentNodeOperation {
    NONE,
    ADDITION,
    SUBTRACTION,
    MULTIPLICATION,
    DIVISION,
    MODULO,
    POWER,
    BIT_SHIFT_LEFT,
    BIT_SHIFT_RIGHT,
    BIT_AND,
    BIT_OR,
    BIT_XOR,
};
export class AssignmentNode extends ExpressionNode {
    operation: AssignmentNodeOperation = AssignmentNodeOperation.NONE;
    variant_op: VariantOperator = VariantOperator.MAX;
    assignee?: ExpressionNode = undefined;
    assigned_value?: ExpressionNode = undefined;
    use_conversion_assign: boolean = false;
};
export class AwaitNode extends ExpressionNode {
    to_await?: ExpressionNode = undefined;
};
export enum BinaryOpNodeOpType {
    ADDITION,
    SUBTRACTION,
    MULTIPLICATION,
    DIVISION,
    MODULO,
    POWER,
    BIT_LEFT_SHIFT,
    BIT_RIGHT_SHIFT,
    BIT_AND,
    BIT_OR,
    BIT_XOR,
    LOGIC_AND,
    LOGIC_OR,
    CONTENT_TEST,
    COMP_EQUAL,
    COMP_NOT_EQUAL,
    COMP_LESS,
    COMP_LESS_EQUAL,
    COMP_GREATER,
    COMP_GREATER_EQUAL,
};
export class BinaryOpNode extends ExpressionNode {
    operation: BinaryOpNodeOpType = BinaryOpNodeOpType.ADDITION;
    variant_op: VariantOperator = VariantOperator.MAX;
    left_operand?: ExpressionNode = undefined;
    right_operand?: ExpressionNode = undefined;
};
export class BreakNode extends Node {};
export class BreakpointNode extends Node {};
export class CallNode extends ExpressionNode {
    callee?: ExpressionNode = undefined;
    arguments!: Array<ExpressionNode>;
    function_name!: string;
    is_super: boolean = false;
    is_static: boolean = false;
};
export class CastNode extends ExpressionNode {
    operand?: ExpressionNode = undefined;
    cast_type?: TypeNode = undefined;
};
export class EnumNodeValue {
    identifier?: IdentifierNode = undefined;
    custom_value?: ExpressionNode = undefined;
    parent_enum?: EnumNode = undefined;
    index: number = -1;
    resolved: boolean = false;
    value: number = 0;
    line: number = 0;
    leftmost_column: number = 0;
    rightmost_column: number = 0;
    doc_data!: MemberDocData;
};
export class EnumNode extends Node {
    identifier?: IdentifierNode = undefined;
    values!: Array<EnumNodeValue>;
    dictionary!: Variant;
    doc_data!: MemberDocData;
};
export enum ClassNodeMemberType {
    UNDEFINED,
    CLASS,
    CONSTANT,
    FUNCTION,
    SIGNAL,
    VARIABLE,
    ENUM,
    ENUM_VALUE,
    GROUP,
};
/*
type ClassNodeMember = {
    type: ClassNodeMemberType = ClassNodeMemberType.CLASS;
    m_class?: ClassNode = undefined;
} | {
    type: ClassNodeMemberType = ClassNodeMemberType.CONSTANT;
    constant: ConstantNode;
} | {
    type: ClassNodeMemberType = ClassNodeMemberType.FUNCTION;
    function: FunctionNode;
} | {
    type: ClassNodeMemberType = ClassNodeMemberType.SIGNAL;
    signal: SignalNode;
} | {
    type: ClassNodeMemberType = ClassNodeMemberType.VARIABLE;
    variable: VariableNode;
} | {
    type: ClassNodeMemberType = ClassNodeMemberType.ENUM;
    m_enum: EnumNode;
} | {
    type: ClassNodeMemberType = ClassNodeMemberType.ENUM_VALUE;
    enum_value: EnumNodeValue;
};
*/
type ClassNodeMember = ClassNode | ConstantNode | FunctionNode | SignalNode | VariableNode | EnumNode | EnumNodeValue;
export class ClassNode extends Node {
    identifier?: IdentifierNode = undefined;
    icon_path!: string;
    simplified_icon_path!: string;
    members!: Array<ClassNodeMember>;
    members_indices!: Record<string, number>;
    //outer?: ClassNode = undefined;
    extends_used: boolean = false;
    onready_used: boolean = false;
    has_static_data: boolean = false;
    annotated_static_unload: boolean = false;
    extends_path!: string;
    extends!: Array<IdentifierNode>;
    base_type!: DataType;
    fqcn!: string;
    doc_data!: ClassDocData;
    resolved_interface: boolean = false;
    resolved_body: boolean = false;
};
export class ConstantNode extends AssignableNode {
    doc_data!: MemberDocData;
};
export class ContinueNode extends Node {};
export class DictionaryNodePair {
    key?: ExpressionNode = undefined;
    value?: ExpressionNode = undefined;
};
export enum DictionaryNodeStyle {
    LUA_TABLE,
    PYTHON_DICT,
};
export class DictionaryNode extends ExpressionNode {
    elements!: Array<DictionaryNodePair>;
    style: DictionaryNodeStyle = DictionaryNodeStyle.PYTHON_DICT;
};
export class ForNode extends Node {
    variable?: IdentifierNode = undefined;
    datatype_specifier?: TypeNode = undefined;
    use_conversion_assign: boolean = false;
    list?: ExpressionNode = undefined;
    loop?: SuiteNode = undefined;
};
export class FunctionNode extends Node {
    identifier?: IdentifierNode = undefined;
    parameters!: Array<ParameterNode>;
    parameters_indices!: Record<string, number>;
    return_type?: TypeNode = undefined;
    body?: SuiteNode = undefined;
    is_static: boolean = false;
    is_coroutine: boolean = false;
    rpc_config!: Variant;
    info!: MethodInfo;
    source_lambda?: LambdaNode = undefined;
    default_arg_values!: Array<Variant>;
    doc_data!: MemberDocData;
    min_local_doc_line: number = 0;
    resolved_signature: boolean = false;
    resolved_body: boolean = false;
};
export class GetNodeNode extends ExpressionNode {
    full_path!: string;
    use_dollar: boolean = true;
};
export enum IdentifierNodeSource {
    UNDEFINED_SOURCE,
    FUNCTION_PARAMETER,
    LOCAL_VARIABLE,
    LOCAL_CONSTANT,
    LOCAL_ITERATOR,
    LOCAL_BIND,
    MEMBER_VARIABLE,
    MEMBER_CONSTANT,
    MEMBER_FUNCTION,
    MEMBER_SIGNAL,
    MEMBER_CLASS,
    INHERITED_VARIABLE,
    STATIC_VARIABLE,
};
export class IdentifierNode extends ExpressionNode {
    name!: string;
    //suite?: SuiteNode = undefined;
    source: IdentifierNodeSource = IdentifierNodeSource.UNDEFINED_SOURCE;
    //union {
    //    parameter_source?: ParameterNode = undefined;
    //    bind_source?: IdentifierNode;
    //    variable_source?: VariableNode;
    //    constant_source?: ConstantNode;
    //    signal_source?: SignalNode;
    //    function_source?: FunctionNode;
    //};
    function_source_is_static: boolean = false;
    source_function?: FunctionNode = undefined;
    usages: number = 0;
};
export class IfNode extends Node {
    condition?: ExpressionNode = undefined;
    true_block?: SuiteNode = undefined;
    false_block?: SuiteNode = undefined;
};
export class LambdaNode extends ExpressionNode {
    function?: FunctionNode = undefined;
    parent_function?: FunctionNode = undefined;
    parent_lambda?: LambdaNode = undefined;
    captures!: Array<IdentifierNode>;
    captures_indices!: Record<string, number>;
    use_self: boolean = false;
};
export class LiteralNode extends ExpressionNode {
    value!: Variant;
};
export class MatchNode extends Node {
    test?: ExpressionNode = undefined;
    branches!: Array<MatchBranchNode>;
};
export class MatchBranchNode extends Node {
    patterns!: Array<PatternNode>;
    block?: SuiteNode = undefined;
    has_wildcard: boolean = false;
    guard_body?: SuiteNode = undefined;
};
export class ParameterNode extends AssignableNode {};
export class PassNode extends Node {};
export enum PatternNodeType {
    PT_LITERAL,
    PT_EXPRESSION,
    PT_BIND,
    PT_ARRAY,
    PT_DICTIONARY,
    PT_REST,
    PT_WILDCARD,
};
export class PatternNodePair {
    key?: ExpressionNode = undefined;
    value_pattern?: PatternNode = undefined;
};
export class PatternNode extends Node {
    pattern_type: PatternNodeType = PatternNodeType.PT_LITERAL;
    //union {
    literal?: LiteralNode = undefined;
    bind?: IdentifierNode;
    expression?: ExpressionNode;
    //};
    array!: Array<PatternNode>;
    rest_used: boolean = false;
    dictionary!: Array<PatternNodePair>;
    binds!: Record<string, IdentifierNode>;
};
export class PreloadNode extends ExpressionNode {
    path?: ExpressionNode = undefined;
    resolved_path!: string;
    //resource: Ref<Resource>;
};
export class ReturnNode extends Node {
    return_value?: ExpressionNode = undefined;
    void_return: boolean = false;
};
export class SelfNode extends ExpressionNode {
    //current_class?: ClassNode = undefined;
};
export class SignalNode extends Node {
    identifier?: IdentifierNode = undefined;
    parameters!: Array<ParameterNode>;
    parameters_indices!: Record<string, number>;
    method_info!: MethodInfo;
    doc_data!: MemberDocData;
    usages: number = 0;
};
export class SubscriptNode extends ExpressionNode {
    base?: ExpressionNode = undefined;
    //union {
    index?: ExpressionNode = undefined;
    attribute?: IdentifierNode;
    //};
    is_attribute: boolean = false;
};
export enum SuiteNodeLocalType {
    UNDEFINED,
    CONSTANT,
    VARIABLE,
    PARAMETER,
    FOR_VARIABLE,
    PATTERN_BIND,
};
export class SuiteNodeLocal {
    type: SuiteNodeLocalType = SuiteNodeLocalType.UNDEFINED;
    //union {
    constant?: ConstantNode = undefined;
    variable?: VariableNode;
    parameter?: ParameterNode;
    bind?: IdentifierNode;
    //};
    name!: string;
    source_function?: FunctionNode = undefined;
    start_line: number = 0
    end_line: number = 0;
    start_column: number = 0
    end_column: number = 0;
    leftmost_column: number = 0
    rightmost_column: number = 0;
};
export class SuiteNode extends Node {
    //parent_block?: SuiteNode = undefined;
    statements!: Array<Node>;
    empty!: SuiteNodeLocal;
    locals!: Array<SuiteNodeLocal>;
    locals_indices!: Record<string, number>;
    //parent_function?: FunctionNode = undefined;
    //parent_if?: IfNode = undefined;
    has_return: boolean = false;
    has_continue: boolean = false;
    has_unreachable_code: boolean = false;
    is_in_loop: boolean = false;
};
export class TernaryOpNode extends ExpressionNode {
    condition?: ExpressionNode = undefined;
    true_expr?: ExpressionNode = undefined;
    false_expr?: ExpressionNode = undefined;
};
export class TypeNode extends Node {
    type_chain!: Array<IdentifierNode>;
    container_types!: Array<TypeNode>;
};
export class TypeTestNode extends ExpressionNode {
    operand?: ExpressionNode = undefined;
    test_type?: TypeNode = undefined;
    test_datatype!: DataType;
};
export enum UnaryOpNodeOpType {
    POSITIVE,
    NEGATIVE,
    COMPLEMENT,
    LOGIC_NOT,
};
export class UnaryOpNode extends ExpressionNode {
    operation: UnaryOpNodeOpType = UnaryOpNodeOpType.POSITIVE;
    variant_op: VariantOperator = VariantOperator.MAX;
    operand?: ExpressionNode = undefined;
};
export enum VariableNodePropertyStyle {
    NONE,
    INLINE,
    SETGET,
};
export class VariableNode extends AssignableNode {
    property: VariableNodePropertyStyle = VariableNodePropertyStyle.NONE;
    //union {
    setter?: FunctionNode = undefined;
    setter_pointer?: IdentifierNode;
    //};
    setter_parameter?: IdentifierNode = undefined;
    //union {
    getter?: FunctionNode = undefined;
    getter_pointer?: IdentifierNode;
    //};
    exported: boolean = false;
    onready: boolean = false;
    export_info!: PropertyInfo;
    assignments: number = 0;
    is_static: boolean = false;
    doc_data!: MemberDocData;
};
export class WhileNode extends Node {
    condition?: ExpressionNode = undefined;
    loop?: SuiteNode = undefined;
};
