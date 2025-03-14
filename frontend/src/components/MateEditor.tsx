import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {
    Button,
    Checkbox,
    Col,
    Collapse,
    ConfigProvider,
    Divider,
    Form,
    FormListFieldData,
    Input,
    InputNumber,
    message,
    Radio,
    Row,
    Space,
    Tooltip
} from 'antd';
import type {FormListOperation} from 'antd/es/form';
import {WindowSetTitle} from '../../wailsjs/runtime';
import {COM3D2} from '../../wailsjs/go/models';
import {SaveFile} from '../../wailsjs/go/main/App';
import {useTranslation} from "react-i18next";
import {DeleteOutlined, PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import MatePropertyItemType1 from "./MatePropertyItemType1";
import MatePropertyItemType2 from "./MatePropertyItemType2";
import {ReadMateFile, WriteMateFile} from "../../wailsjs/go/COM3D2/MateService";
import MatePropertyListType1Virtualized from "./MatePropertyListType1Virtualized";
import {Editor} from "@monaco-editor/react";
import {useDarkMode} from "../hooks/themeSwitch";
import {COM3D2HeaderConstants} from "../utils/ConstCOM3D2";
import Mate = COM3D2.Mate;
import Material = COM3D2.Material;
import TexProperty = COM3D2.TexProperty;
import ColProperty = COM3D2.ColProperty;
import VecProperty = COM3D2.VecProperty;
import FProperty = COM3D2.FProperty;
import RangeProperty = COM3D2.RangeProperty;
import TexOffsetProperty = COM3D2.TexOffsetProperty;
import TexScaleProperty = COM3D2.TexScaleProperty;
import KeywordProperty = COM3D2.KeywordProperty;

interface MateEditorProps {
    filePath?: string; // 传入要打开的 .mate 文件路径
}

export interface MateEditorRef {
    handleReadMateFile: () => Promise<void>;
    handleSaveMateFile: () => Promise<void>;
    handleSaveAsMateFile: () => Promise<void>;
}


// ------------------- 样式1：简单的上下排列 -------------------
const Style1Properties: React.FC<{
    fields: FormListFieldData[];
    add: FormListOperation['add'];
    remove: FormListOperation['remove'];
    form: any;
}> = ({fields, add, remove, form}) => {
    const {t} = useTranslation();

    // 1. 先按 TypeName 进行分组
    const groupedFields = fields.reduce((acc, field) => {
        const typeName = form.getFieldValue(['properties', field.name, 'TypeName']) || "unknown"; // 获取 TypeName
        if (!acc[typeName]) acc[typeName] = [];
        acc[typeName].push(field);
        return acc;
    }, {} as Record<string, FormListFieldData[]>);

    return (
        <>
            {/* 2. 遍历分组后的数据进行渲染 */}
            {Object.entries(groupedFields).map(([typeName, groupFields], id) => (
                <div key={`groupedFields-${id}`}>
                    {/* 3. 在每个 typeName 组的开头加一个分割线 */}
                    <Divider>{t(`MateEditor.${typeName}`)}</Divider>

                    {/* 4. 渲染该 typeName 组内的所有属性 */}
                    {groupFields.map(({key, name, ...restField}, id) => (
                        <div key={`groupFields-item-${groupFields}-${id}-${typeName}-${name}`}
                             style={{position: "relative", marginBottom: 16}}>
                            <MatePropertyItemType1 name={name} restField={restField} form={form}/>
                            <Button
                                onClick={() => remove(name)}
                                style={{position: "absolute", bottom: 0, right: 0}}
                                icon={<DeleteOutlined/>}
                            />
                        </div>
                    ))}
                </div>
            ))}

            {/* 5. 添加新属性按钮 */}
            <Form.Item>
                <Button type="primary" onClick={() => add()} block icon={<PlusOutlined/>}>
                    {t("MateEditor.add_new_property")}
                </Button>
            </Form.Item>
        </>
    );
};

// ------------------- 样式1.5：简单的上下排列，为大文件准备的虚拟渲染 -------------------
const Style1PropertiesVirtualized: React.FC<{
    fields: FormListFieldData[];
    add: FormListOperation["add"];
    remove: FormListOperation["remove"];
    form: any;
}> = ({fields, add, remove, form}) => {
    const {t} = useTranslation();

    return (
        <>
            <MatePropertyListType1Virtualized
                fields={fields}
                remove={remove}
                form={form}
            />

            <Button
                type="primary"
                onClick={() => add()}
                block
                icon={<PlusOutlined/>}
                style={{marginTop: 8}}
            >
                {t("MateEditor.add_new_property")}
            </Button>
        </>
    );
};


// ======================= 样式2：按 typeName 分栏 + 左列表/右编辑区  =======================
const Style2Properties: React.FC<{
    fields: FormListFieldData[];
    add: FormListOperation['add'];
    remove: FormListOperation['remove'];
    form: any;
}> = ({fields, add, remove, form}) => {
    const {t} = useTranslation();
    // 引用左侧列表容器
    const leftSidebarRef = useRef<HTMLDivElement>(null);

    // 当前选中的属性下标（在 fields 数组里的 name）
    const [selectedField, setSelectedField] = useState<number | null>(null);

    // 用来筛选 typeName
    const [filterTypeName, setFilterTypeName] = useState<string>('all');

    // 搜索关键词状态
    const [searchKeyword, setSearchKeyword] = useState('');

    // 按筛选规则和搜索过滤
    const filteredFields = fields.filter((f: FormListFieldData) => {
        const pType = form.getFieldValue(['properties', f.name, 'TypeName']);
        const pName = form.getFieldValue(['properties', f.name, 'propName']) || '';

        // 组合过滤条件
        const typeMatch = filterTypeName === 'all' || pType === filterTypeName;
        const nameMatch = pName.toLowerCase().includes(searchKeyword.toLowerCase());

        return typeMatch && nameMatch;
    });


    // 再按 TypeName 分组
    const grouped: Record<string, { field: FormListFieldData; index: number; propName: string }[]> = {};
    filteredFields.forEach((f: FormListFieldData) => {
        const pType = form.getFieldValue(['properties', f.name, 'TypeName']);
        const pName = form.getFieldValue(['properties', f.name, 'propName']) || t('MateEditor.no_name');
        if (!grouped[pType]) {
            grouped[pType] = [];
        }
        grouped[pType].push({
            field: f,
            index: f.name,
            propName: pName,
        });
    });

    const groupKeys = Object.keys(grouped);

    useEffect(() => {
        leftSidebarRef.current?.focus();  // 组件挂载后自动聚焦左侧列表
    }, []);


    // 键盘事件处理函数，用于根据方向键更新选中项
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // 扁平化所有选项的索引数组
        const flatIndices = groupKeys.reduce((acc: number[], TypeName) => {
            const indices = grouped[TypeName].map(item => item.index);
            return acc.concat(indices);
        }, []);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (flatIndices.length === 0) return;
            if (selectedField === null) {
                setSelectedField(flatIndices[0]);
            } else {
                const currentIndex = flatIndices.findIndex(val => val === selectedField);
                const nextIndex = currentIndex < flatIndices.length - 1 ? flatIndices[currentIndex + 1] : flatIndices[currentIndex];
                setSelectedField(nextIndex);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (flatIndices.length === 0) return;
            if (selectedField === null) {
                setSelectedField(flatIndices[flatIndices.length - 1]);
            } else {
                const currentIndex = flatIndices.findIndex(val => val === selectedField);
                const prevIndex = currentIndex > 0 ? flatIndices[currentIndex - 1] : flatIndices[currentIndex];
                setSelectedField(prevIndex);
            }
        }
    };

    // 自动滚动选中项进入视图
    useEffect(() => {
        if (selectedField !== null) {
            const el = document.getElementById(`sidebar-item-${selectedField}`);
            el?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
    }, [selectedField]);


    // 找到当前选中的 field
    const selectedFieldData = fields.find((f) => f.name === selectedField);

    return (
        <Row gutter={16}>
            {/* 左侧列表：按分组 -> 组内列出可点击 */}
            <Col span={8}
                 ref={leftSidebarRef}        /* 引用左侧列表容器 */
                 tabIndex={0}                /* 使 div 可聚焦 */
                 onKeyDown={handleKeyDown}   /* 键盘事件监听 */
                 style={{
                     borderRight: '1px solid #ddd',
                     height: 'calc(100vh - 230px)',
                     overflowY: 'auto',
                     display: 'flex',
                     flexDirection: 'column',
                 }}>
                {/* TypeName 选择器 靠左 */}
                <div style={{textAlign: 'left', marginBottom: 8}}>
                    <Radio.Group
                        value={filterTypeName}
                        onChange={(e) => setFilterTypeName(e.target.value)}
                        optionType="button"
                    >
                        <Radio.Button value="all">{t('MateEditor.all')}</Radio.Button>
                        <Radio.Button value="tex">{t('MateEditor.tex_no_brackets')}</Radio.Button>
                        <Radio.Button value="col">{t('MateEditor.col_no_brackets')}</Radio.Button>
                        <Radio.Button value="vec">{t('MateEditor.vec_no_brackets')}</Radio.Button>
                        <Radio.Button value="f">{t('MateEditor.f_no_brackets')}</Radio.Button>
                        <Radio.Button value="range">{t('MateEditor.range_no_brackets')}</Radio.Button>
                        <Radio.Button value="texOffset">{t('MateEditor.tex_offset_no_brackets')}</Radio.Button>
                        <Radio.Button value="texScale">{t('MateEditor.tex_scale_no_brackets')}</Radio.Button>
                        <Radio.Button value="keyword">{t('MateEditor.keyword_no_brackets')}</Radio.Button>
                        <Radio.Button value="unknown">{t('MateEditor.unknown')}</Radio.Button>
                    </Radio.Group>
                    <Input.Search
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        style={{marginTop: 8}}
                    />
                </div>

                {/* 左边栏，按 TypeName 分组 */}
                {groupKeys.map((TypeName) => (
                    <div style={{textAlign: 'left', marginBottom: 16}}>
                        <Divider plain><b>{t(`MateEditor.${TypeName}`)}</b></Divider>
                        {grouped[TypeName].map(({field, index, propName}) => (
                            <div
                                id={`sidebar-item-${index}`}
                                key={`sidebar-item-${TypeName}-${field.key}`}
                                onClick={() => setSelectedField(index)}
                                style={{
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    borderRadius: 4,
                                    backgroundColor: selectedField === index ? '#e6f7ff' : undefined,
                                    marginBottom: 4,
                                    position: 'relative',
                                }}
                            >
                                {propName}
                                {/* 添加删除按钮 */}
                                <Button
                                    type="text"
                                    icon={<DeleteOutlined/>}
                                    onClick={(e) => {
                                        e.stopPropagation(); // 阻止点击事件冒泡
                                        remove(index);       // 删除当前属性
                                        if (selectedField === index) {
                                            setSelectedField(null); // 如果删除的是当前选中项，清除选中状态
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: 4,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        padding: '0 4px'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                ))}
                <Button
                    type="primary"
                    onClick={() => {
                        const initialValue = filterTypeName !== 'all'
                            ? {TypeName: filterTypeName}
                            : {TypeName: 'unknown'}; // 当选择"全部"时默认 unknown 类型
                        add(initialValue);
                        setSelectedField(null);
                    }}
                    icon={<PlusOutlined/>}
                    block
                >
                    {t('MateEditor.add_new_property')}
                </Button>
            </Col>

            {/* 右侧编辑区：仅渲染选中的那一个 */}
            <Col span={16}>
                {selectedField !== null && selectedFieldData && (
                    <div style={{
                        height: 'calc(100vh - 270px)',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <MatePropertyItemType2
                            key={'property-item-' + selectedFieldData.key}
                            name={selectedFieldData.name}
                            restField={selectedFieldData}
                            form={form}
                        />
                        <Button
                            onClick={() => {
                                remove(selectedFieldData.name);
                                setSelectedField(null);
                            }}
                            danger
                            style={{position: 'absolute', bottom: 0, right: 0}}
                            icon={<DeleteOutlined/>}
                        />
                    </div>
                )}
            </Col>
        </Row>
    );
};


// ======================= 样式3：直接用 Monaco Editor 展示/编辑整个 mateData JSON =======================
const Style3Properties: React.FC<{
    mateData: Mate | null;
    setMateData: (m: Mate | null) => void;
}> = ({mateData, setMateData}) => {
    const isDarkMode = useDarkMode();
    const [jsonValue, setJsonValue] = useState("");
    const editorRef = useRef<any>(null);
    const isInternalUpdate = useRef(false);
    const prevColDataRef = useRef<string | null>(null);

    // 处理 ColData 的外部更新（如文件加载）
    useEffect(() => {
        if (mateData) {
            const mateDataJson = JSON.stringify(mateData);
            // Only update if this is an external change, not from our editor
            if (!isInternalUpdate.current && mateDataJson !== prevColDataRef.current) {
                setJsonValue(JSON.stringify(mateData, null, 2));
                prevColDataRef.current = mateDataJson;
            }
        } else {
            setJsonValue("");
            prevColDataRef.current = null;
        }
    }, [mateData]);

    // 初始化第一次渲染
    useEffect(() => {
        if (mateData) {
            setJsonValue(JSON.stringify(mateData, null, 2));
            prevColDataRef.current = JSON.stringify(mateData);
        }
    }, []);

    // Handle the editor being mounted
    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
    };

    // When user edits in the editor
    const handleEditorChange = (value?: string) => {
        const newVal = value ?? "";

        // Update local state without full re-render
        if (newVal !== jsonValue) {
            setJsonValue(newVal);
        }

        try {
            const parsed = JSON.parse(newVal);

            // Only update parent if actual content changed
            if (JSON.stringify(parsed) !== JSON.stringify(mateData)) {
                isInternalUpdate.current = true;
                setMateData(parsed);
                prevColDataRef.current = JSON.stringify(parsed);

                // Reset the flag after a delay to allow React to process
                setTimeout(() => {
                    isInternalUpdate.current = false;
                }, 0);
            }
        } catch (err) {
            // JSON is not valid, don't update parent
        }
    };

    return (
        <div style={{
            height: "calc(100vh - 165px)",
            borderRadius: '8px',   // 添加圆角
            overflow: 'hidden'     // 隐藏超出圆角范围的部分
        }}>
            <Editor
                language="json"
                theme={isDarkMode ? "vs-dark" : "vs"}
                value={jsonValue}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                    minimap: {enabled: true},
                    tabSize: 2,
                }}
            />
        </div>
    );
};


/**
 * MateEditor 组件
 *
 * - 读取 .mate 文件 -> 填充 form
 * - 在前端编辑 -> 组装回 Mate 对象
 * - 保存/另存为
 */
const MateEditor = forwardRef<MateEditorRef, MateEditorProps>((props, ref) => {
    const {t} = useTranslation();
    const {filePath} = props;

    // 整体 .mate 数据
    const [mateData, setMateData] = useState<Mate | null>(null);

    // 是否允许编辑 Signature, Version 等字段（默认禁用）
    const [isSignatureEditable, setIsSignatureEditable] = useState(false);

    // 是否允许编辑文件头的其他字段（默认启用，仅模式 3 禁用，模式 3 应当在 JSON 中直接编辑）
    const [isHeaderEditable, setIsHeaderEditable] = useState(true);

    // 用于 antd 的表单来管理字段
    const [form] = Form.useForm();

    // 用来切换样式模式：1 or 2 or 3
    const [viewMode, setViewMode] = useState<1 | 2 | 3>(() => {
        const saved = localStorage.getItem('mateEditorViewMode');
        return saved ? Number(saved) as 1 | 2 | 3 : 1;
    });


    // 当组件挂载或 filePath 改变时，自动读取
    useEffect(() => {
        if (filePath) {

            const fileName = filePath.split(/[\\/]/).pop();
            WindowSetTitle("COM3D2 MOD EDITOR V2 by 90135 —— " + t("Infos.editing_colon") + fileName + "  (" + filePath + ")");

            handleReadMateFile();
        } else {
            WindowSetTitle("COM3D2 MOD EDITOR V2 by 90135");
            // 如果没有文件，则初始化为新文件
            const mate = new Mate();
            mate.Signature = COM3D2HeaderConstants.MateSignature;
            mate.Version = COM3D2HeaderConstants.MateVersion;
            setMateData(mate);
            form.resetFields();
        }
    }, [filePath]);

    /**
     * 读取 .mate 文件
     */
    const handleReadMateFile = async () => {
        if (!filePath) {
            message.error(t('Infos.pls_open_file_first'));
            return;
        }
        try {
            const data = await ReadMateFile(filePath);
            setMateData(data);
            // 同步到 form
            form.setFieldsValue(transformMateToForm(data));
        } catch (error: any) {
            console.error(error);
            message.error(t('Errors.read_mate_file_failed_colon') + error);
        }
    };

    /**
     * 保存 .mate 文件（覆盖写回原路径）
     */
    const handleSaveMateFile = async () => {
        if (!filePath) {
            message.error(t('Errors.pls_open_file_first_new_file_use_save_as'));
            return;
        }
        if (!mateData) {
            message.error(t('Errors.pls_load_file_first'));
            return;
        }
        try {
            // 模式 3 JSON 编辑，直接保存
            if (viewMode === 3) {
                await WriteMateFile(filePath, mateData);
                message.success(t('Infos.success_save_file'));
                return;
            }
            // 其他模式使用表单数据
            // 获取最新的表单数据
            const values = form.getFieldsValue(true);
            // form -> Mate
            const newMate = transformFormToMate(values, mateData);

            // 调用后端保存
            await WriteMateFile(filePath, newMate);
            message.success(t('Infos.success_save_file'));
        } catch (error: any) {
            console.error(error);
            message.error(t('Errors.save_file_failed_colon') + error);
        }
    };

    /**
     * 另存为 .mate 文件
     */
    const handleSaveAsMateFile = async () => {
        if (!mateData) {
            message.error(t('Errors.save_as_file_failed_colon') + t('Errors.pls_load_file_first'));
            return;
        }
        try {
            // 模式 3 JSON 编辑，直接保存
            if (viewMode === 3) {
                // 询问保存路径
                const newPath = await SaveFile("*.mate", t('Infos.com3d2_mate_file'));
                if (!newPath) {
                    // 用户取消
                    return;
                }

                await WriteMateFile(newPath, mateData);
                message.success(t('Infos.success_save_as_file_colon') + newPath);
                return;
            }


            // 获取最新表单数据
            const values = form.getFieldsValue(true);
            const newMate = transformFormToMate(values, mateData);

            // 询问保存路径
            const newPath = await SaveFile("*.mate", t('Infos.com3d2_mate_file'));
            if (!newPath) {
                // 用户取消
                return;
            }

            await WriteMateFile(newPath, newMate);
            message.success(t('Infos.success_save_as_file_colon') + newPath);
        } catch (error: any) {
            console.error(error);
            message.error(t('Errors.save_as_file_failed_colon') + error.message);
        }
    };


    /**
     * 监听 Ctrl+S 快捷键，触发保存
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Windows/Linux: Ctrl+S, macOS: Cmd+S => e.metaKey
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSaveMateFile();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSaveMateFile]);


    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        handleReadMateFile,
        handleSaveMateFile,
        handleSaveAsMateFile,
    }));

    /**
     * 把 Mate 对象映射到表单字段
     * 便于 antd 的 Form 做统一管理
     */
    const transformMateToForm = (mate: Mate) => {
        return {
            signature: mate.Signature,
            version: mate.Version,
            name: mate.Name,
            materialName: mate.Material?.Name,
            shaderName: mate.Material?.ShaderName,
            shaderFilename: mate.Material?.ShaderFilename,

            properties: mate.Material?.Properties?.map((prop) => {
                // 不同类型的 property
                switch (prop.TypeName) {
                    case 'tex':
                        // TS: prop as TexProperty
                        const texProp = prop as TexProperty;
                        return {
                            TypeName: texProp.TypeName,
                            propName: texProp.PropName,
                            subTag: texProp.SubTag,
                            // 针对 tex2d / cube
                            tex2dName: texProp.Tex2D?.Name,
                            tex2dPath: texProp.Tex2D?.Path,
                            offsetX: texProp.Tex2D?.Offset?.[0],
                            offsetY: texProp.Tex2D?.Offset?.[1],
                            scaleX: texProp.Tex2D?.Scale?.[0],
                            scaleY: texProp.Tex2D?.Scale?.[1],
                            // 针对 texRT
                            discardedStr1: texProp.TexRT?.DiscardedStr1,
                            discardedStr2: texProp.TexRT?.DiscardedStr2,
                        };
                    case 'col':
                        const colProp = prop as ColProperty;
                        return {
                            TypeName: colProp.TypeName,
                            propName: colProp.PropName,
                            colorR: colProp.Color[0],
                            colorG: colProp.Color[1],
                            colorB: colProp.Color[2],
                            colorA: colProp.Color[3],
                        };
                    case 'vec':
                        const vecProp = prop as VecProperty;
                        return {
                            TypeName: vecProp.TypeName,
                            propName: vecProp.PropName,
                            vec0: vecProp.Vector[0],
                            vec1: vecProp.Vector[1],
                            vec2: vecProp.Vector[2],
                            vec3: vecProp.Vector[3],
                        };
                    case 'f':
                        const fProp = prop as FProperty;
                        return {
                            TypeName: fProp.TypeName,
                            propName: fProp.PropName,
                            number: fProp.Number,
                        };
                    case 'range':
                        const rangeProp = prop as RangeProperty;
                        return {
                            TypeName: rangeProp.TypeName,
                            propName: rangeProp.PropName,
                            number: rangeProp.Number,
                        };
                    case 'tex_offset':
                        const texOffsetProp = prop as TexOffsetProperty;
                        return {
                            TypeName: texOffsetProp.TypeName,
                            propName: texOffsetProp.PropName,
                            offsetX: texOffsetProp.OffsetX,
                            offsetY: texOffsetProp.OffsetY,
                        };
                    case 'tex_scale':
                        const texScaleProp = prop as TexScaleProperty;
                        return {
                            TypeName: texScaleProp.TypeName,
                            propName: texScaleProp.PropName,
                            scaleX: texScaleProp.ScaleX,
                            scaleY: texScaleProp.ScaleY,
                        };
                    case 'keyword':
                        const keywordProp = prop as KeywordProperty;
                        return {
                            TypeName: keywordProp.TypeName,
                            propName: keywordProp.PropName,
                            // count: keywordProp.Count, // 自动计算
                            keywords: keywordProp.Keywords.map(k => ({
                                key: k.Key,
                                value: k.Value
                            })),
                        };
                    default:
                        return {
                            TypeName: 'unknown',
                            propName: 'unknown',
                        };
                }
            }) || [],
        };
    };

    /**
     * 将 form 上的数据组装回 Mate 对象
     */
    const transformFormToMate = (values: any, oldMate: Mate): Mate => {
        const newMate = COM3D2.Mate.createFrom(oldMate);

        // 基本字段
        if (isSignatureEditable) {
            newMate.Signature = values.signature;
            newMate.Version = parseInt(values.version, 10);
        }
        newMate.Name = values.name;

        // Material
        if (!newMate.Material) {
            newMate.Material = {} as Material;
        }
        newMate.Material.Name = values.materialName;
        newMate.Material.ShaderName = values.shaderName;
        newMate.Material.ShaderFilename = values.shaderFilename;

        // Properties
        const newProps: any[] = [];
        if (Array.isArray(values.properties)) {
            values.properties.forEach((item: any) => {
                switch (item.TypeName) {
                    case 'tex':
                        // 根据 subTag 判断
                        if (item.subTag === 'tex2d' || item.subTag === 'cube') {
                            newProps.push({
                                TypeName: item.TypeName,
                                PropName: item.propName,
                                SubTag: item.subTag,
                                Tex2D: {
                                    Name: item.tex2dName,
                                    Path: item.tex2dPath,
                                    Offset: [parseFloat(item.offsetX) || 0, parseFloat(item.offsetY) || 0],
                                    Scale: [parseFloat(item.scaleX) || 1, parseFloat(item.scaleY) || 1]
                                },
                            });
                        } else if (item.subTag === 'texRT') {
                            newProps.push({
                                    TypeName: item.TypeName,
                                    PropName: item.propName,
                                    SubTag: 'texRT',
                                    TexRT: {
                                        DiscardedStr1: item.discardedStr1,
                                        DiscardedStr2: item.discardedStr2,
                                    }
                                }
                            );
                        } else if (item.subTag === 'null') {
                            // 生成一个空的 tex 属性
                            newProps.push({
                                TypeName: item.TypeName,
                                PropName: item.propName,
                                SubTag: 'null',
                            });
                        }
                        break;
                    case 'col':
                        newProps.push({
                            TypeName: item.TypeName,
                            PropName: item.propName,
                            Color: [
                                parseFloat(item.colorR) || 0,
                                parseFloat(item.colorG) || 0,
                                parseFloat(item.colorB) || 0,
                                parseFloat(item.colorA) || 0,
                            ],
                        });
                        break;
                    case 'vec':
                        newProps.push({
                            TypeName: item.TypeName,
                            PropName: item.propName,
                            Vector: [
                                parseFloat(item.vec0) || 0,
                                parseFloat(item.vec1) || 0,
                                parseFloat(item.vec2) || 0,
                                parseFloat(item.vec3) || 0,
                            ],
                        });
                        break;
                    case 'f':
                        newProps.push({
                            TypeName: item.TypeName,
                            PropName: item.propName,
                            Number: parseFloat(item.number) || 0,
                        });
                        break;
                    case 'range':
                        newProps.push({
                            TypeName: item.TypeName,
                            PropName: item.propName,
                            Number: parseFloat(item.number) || 0,
                        });
                        break;
                    case 'tex_offset':
                        newProps.push({
                            TypeName: item.TypeName,
                            PropName: item.propName,
                            OffsetX: parseFloat(item.offsetX) || 0,
                            OffsetY: parseFloat(item.offsetY) || 0,
                        });
                        break;
                    case 'tex_scale':
                        newProps.push({
                            TypeName: item.TypeName,
                            PropName: item.propName,
                            ScaleX: parseFloat(item.scaleX) || 0,
                            ScaleY: parseFloat(item.scaleY) || 0,
                        });
                        break;
                    case 'keyword':
                        const keywords = item.keywords?.map((k: any) => ({
                            Key: k?.key || '',
                            Value: typeof k?.value === 'boolean' ? k.value : false
                        })) || [];

                        newProps.push({
                            TypeName: item.TypeName,
                            PropName: item.propName,
                            Count: keywords.length,  // 自动计算数量
                            Keywords: keywords
                        });
                        break;
                    default:
                        // unknown, do nothing
                        break;
                }
            });
        }
        newMate.Material.Properties = newProps as any;
        return newMate;
    };


    // 当 mateData 变化时同步到表单
    useEffect(() => {
        if (mateData) {
            const formValues = transformMateToForm(mateData);
            form.setFieldsValue(formValues);
        }
    }, [mateData, form]);

    return (
        <div style={{padding: 10}}>
            <ConfigProvider
                theme={{
                    components: {
                        Form: {
                            itemMarginBottom: 10, // 调整 item 的间距
                        },
                    },
                }}
            >
                <Form
                    form={form}
                    layout="horizontal"
                    size="small"
                    labelAlign="left"
                    // Form 级别统一设置 labelCol
                    labelCol={{style: {width: '15vw'}}}
                    requiredMark={false}
                >
                    <Collapse defaultActiveKey={['basic']}>
                        <Collapse.Panel key="basic" header={t('MateEditor.file_header.file_head')}>
                            <Space>
                                <Form.Item name="signature" initialValue={COM3D2HeaderConstants.MateSignature}>
                                    <Input
                                        disabled={!isSignatureEditable}
                                        addonBefore={t('MateEditor.file_header.Signature')}
                                    />
                                </Form.Item>
                                <Form.Item name="version" initialValue={COM3D2HeaderConstants.MateVersion.toString()}>
                                    <InputNumber
                                        disabled={!isSignatureEditable}
                                        addonBefore={t('MateEditor.file_header.Version')}
                                    />
                                </Form.Item>
                                <Form.Item>
                                    <Checkbox
                                        checked={isSignatureEditable}
                                        onChange={(e) => setIsSignatureEditable(e.target.checked)}
                                    >
                                        {t('MateEditor.file_header.enable_edit_do_not_edit')}
                                    </Checkbox>
                                </Form.Item>
                            </Space>

                            <Form.Item name="name">
                                <Input
                                    disabled={!isHeaderEditable}
                                    addonBefore={
                                        <span style={{width: '15vw', display: 'inline-block', textAlign: 'left'}}>
                      {t('MateEditor.file_header.Name')}
                    </span>
                                    }
                                    suffix={
                                        <Tooltip title={t('MateEditor.file_header.Name_tip')}>
                                            <QuestionCircleOutlined/>
                                        </Tooltip>
                                    }
                                />
                            </Form.Item>
                            <Form.Item name="materialName">
                                <Input
                                    disabled={!isHeaderEditable}
                                    addonBefore={
                                        <span style={{width: '15vw', display: 'inline-block', textAlign: 'left'}}>
                      {t('MateEditor.file_header.Material_Name')}
                    </span>
                                    }
                                    suffix={
                                        <Tooltip title={t('MateEditor.file_header.Material_Name_tip')}>
                                            <QuestionCircleOutlined/>
                                        </Tooltip>
                                    }
                                />
                            </Form.Item>
                            <Form.Item name="shaderName">
                                <Input
                                    disabled={!isHeaderEditable}
                                    addonBefore={
                                        <span style={{width: '15vw', display: 'inline-block', textAlign: 'left'}}>
                      {t('MateEditor.file_header.Material_ShaderName')}
                    </span>
                                    }
                                    suffix={
                                        <Tooltip title={t('MateEditor.file_header.Material_ShaderName_tip')}>
                                            <QuestionCircleOutlined/>
                                        </Tooltip>
                                    }
                                />
                            </Form.Item>
                            <Form.Item name="shaderFilename">
                                <Input
                                    disabled={!isHeaderEditable}
                                    addonBefore={
                                        <span style={{width: '15vw', display: 'inline-block', textAlign: 'left'}}>
                      {t('MateEditor.file_header.Material_ShaderFilename')}
                    </span>
                                    }
                                    suffix={
                                        <Tooltip title={t('MateEditor.file_header.Material_ShaderFilename_tip')}>
                                            <QuestionCircleOutlined/>
                                        </Tooltip>
                                    }
                                />
                            </Form.Item>
                        </Collapse.Panel>
                    </Collapse>

                    {/* 用 Radio 切换样式 */}
                    <div style={{marginBottom: 8, marginTop: 8}}>
                        <Radio.Group
                            block
                            value={viewMode}
                            onChange={(e) => {
                                // Get current form values and update mateData before switching view
                                const currentFormValues = form.getFieldsValue(true);
                                if (mateData && e.target.value !== 3) { // 非模式 3 时更新表单数据，因为模式 3 是 JSON
                                    const updatedMate = transformFormToMate(currentFormValues, mateData);
                                    setMateData(updatedMate);
                                }

                                if (e.target.value === 3) {
                                    setIsHeaderEditable(false) // 模式 3 不允许编辑表单文件头，应当直接在 JSON 中编辑
                                } else {
                                    setIsHeaderEditable(true)
                                }

                                setViewMode(e.target.value);
                                localStorage.setItem('mateEditorViewMode', e.target.value.toString());
                            }}
                            options={[
                                {label: t('MateEditor.style1'), value: 1},
                                {label: t('MateEditor.style2'), value: 2},
                                {label: t('MateEditor.style3'), value: 3},
                            ]}
                            optionType="button"
                            buttonStyle="solid"
                        />
                    </div>

                    {viewMode !== 3 && (
                        <Collapse defaultActiveKey={['properties']}>
                            <Collapse.Panel key="properties" header={t('MateEditor.property')}>
                                {viewMode === 1 && (
                                    <Form.List name="properties">
                                        {(fields, {add, remove}) =>
                                            fields.length > 70 ? (
                                                <Style1PropertiesVirtualized
                                                    fields={fields}
                                                    add={add}
                                                    remove={remove}
                                                    form={form}
                                                />
                                            ) : (
                                                <Style1Properties
                                                    fields={fields}
                                                    add={add}
                                                    remove={remove}
                                                    form={form}
                                                />
                                            )
                                        }
                                    </Form.List>
                                )}

                                {viewMode === 2 && (
                                    <Form.List name="properties">
                                        {(fields, {add, remove}) => (
                                            <Style2Properties
                                                fields={fields}
                                                add={add}
                                                remove={remove}
                                                form={form}
                                            />
                                        )}
                                    </Form.List>
                                )}
                            </Collapse.Panel>
                        </Collapse>
                    )}

                    {viewMode === 3 && (
                        <Style3Properties
                            mateData={mateData}
                            setMateData={(newVal) => setMateData(newVal)}
                        />
                    )}
                </Form>
            </ConfigProvider>
        </div>
    );
});

export default MateEditor;