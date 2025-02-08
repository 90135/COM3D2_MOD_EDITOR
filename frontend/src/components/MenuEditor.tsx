import React, {forwardRef, useEffect, useImperativeHandle, useState} from "react";
import {ReadMenuFile, SaveMenuFile} from "../../wailsjs/go/COM3D2/MenuService";
import {Editor} from "@monaco-editor/react";
import {COM3D2} from "../../wailsjs/go/models";
import {Checkbox, CheckboxProps, Collapse, Flex, Input, message, Radio, Space, Tooltip} from "antd";
import {CheckboxGroupProps} from "antd/es/checkbox";
import {useTranslation} from "react-i18next";
import {WindowSetTitle} from "../../wailsjs/runtime";
import {t} from "i18next";
import {SaveFile} from "../../wailsjs/go/main/App";
import {QuestionCircleOutlined} from "@ant-design/icons";
import Menu = COM3D2.Menu;
import Command = COM3D2.Command;

type FormatType = "format1" | "format2" | "format3";

export interface MenuEditorProps {
    filePath?: string;
}

export interface MenuEditorRef {
    handleReadMenuFile: () => Promise<void>;
    handleSaveMenuFile: () => Promise<void>;
    handleSaveAsMenuFile: () => Promise<void>;
}


const MenuEditor = forwardRef<MenuEditorRef, MenuEditorProps>(({filePath}, ref) => {
    const {t} = useTranslation();
    const [menuData, setMenuData] = useState<Menu | null>(null);

    // 只读字段
    const [signature, setSignature] = useState("");
    const [bodySize, setBodySize] = useState<number>(0);

    // 可编辑字段
    const [version, setVersion] = useState<number>(0);
    const [srcFileName, setSrcFileName] = useState("");
    const [itemName, setItemName] = useState("");
    const [category, setCategory] = useState("");
    const [infoText, setInfoText] = useState("");

    // Commands 在 MonacoEditor 中以文本形式显示/编辑
    const [commandsText, setCommandsText] = useState<string>("");

    // 切换显示格式
    const [displayFormat, setDisplayFormat] = useState<FormatType>("format1");

    // 只读字段是否可编辑
    const [isInputDisabled, setIsInputDisabled] = useState(true);

    const [language, setLanguage] = useState("plaintext");

    // 显示格式选项
    const formatOptions: CheckboxGroupProps<string>['options'] = [
        {label: t('MenuEditor.format1'), value: 'format1'},
        {label: t('MenuEditor.format2'), value: 'format2'},
        {label: t('MenuEditor.format3'), value: 'format3'},
    ];

    // 当 filePath 变化或初始化时读取菜单数据
    useEffect(() => {
        if (!filePath) {
            setMenuData(new (Menu));
            return;
        }

        // 设置窗口标题
        WindowSetTitle("COM3D2 MOD EDITOR V2 by 90135 —— " + t('Infos.editing_colon') + filePath);

        async function loadMenu() {
            try {
                if (filePath) {
                    const result = await ReadMenuFile(filePath);
                    setMenuData(result);

                    setSignature(result.Signature);
                    setBodySize(result.BodySize);
                    setVersion(result.Version);
                    setSrcFileName(result.SrcFileName);
                    setItemName(result.ItemName);
                    setCategory(result.Category);
                    setInfoText(result.InfoText);

                    updateCommandsText(result.Commands, displayFormat);
                }
            } catch (err) {
                console.error(err);
                message.error(t('Errors.read_menu_file_failed_colon') + err);
            }
        }

        loadMenu();
    }, [filePath]);


    /**
     * 从后端读取 .menu 文件
     */
    const handleReadMenuFile = async () => {
        if (!filePath) {
            message.error(t('Errors.pls_input_menu_file_path_to_open'));
            return;
        }
        try {
            const result = await ReadMenuFile(filePath);
            setMenuData(result);

            setSignature(result.Signature);
            setBodySize(result.BodySize);
            setVersion(result.Version);
            setSrcFileName(result.SrcFileName);
            setItemName(result.ItemName);
            setCategory(result.Category);
            setInfoText(result.InfoText);

            if (displayFormat === "format1") {
                setCommandsText(commandsToTextFormat1(result.Commands));
            } else if (displayFormat === "format2")  {
                setCommandsText(commandsToTextFormat2(result.Commands));
            } else if (displayFormat === "format3") {
                setCommandsText(commandsToTextFormat3(result.Commands));
            } else {
                setCommandsText("unknown format");
            }
        } catch (err) {
            console.error(err);
            message.error(t('Errors.read_menu_file_failed_colon') + err);
        }
    };

    /**
     * 保存当前编辑内容到后端
     */
    const handleSaveMenuFile = async () => {
        if (!filePath) {
            message.error(t('Errors.pls_input_file_path_first'));
            return;
        }
        if (!menuData) {
            message.error(t('Errors.pls_load_file_first'));
            return;
        }
        try {
            let parsedCommands: Command[];
            switch (displayFormat) {
                case "format1":
                    parsedCommands = parseTextAsFormat1(commandsText);
                    break;
                case "format2":
                    parsedCommands = parseTextAsFormat2(commandsText);
                    break;
                case "format3":
                    parsedCommands = parseTextAsFormat3(commandsText);
                    break;
                default:
                    parsedCommands = [];
            }

            const newMenuData = COM3D2.Menu.createFrom({
                Signature: signature,
                BodySize: bodySize,
                Version: version,
                SrcFileName: srcFileName,
                ItemName: itemName,
                Category: category,
                InfoText: infoText,
                Commands: parsedCommands
            });


            await SaveMenuFile(filePath, newMenuData);
            message.success(t('Infos.success_save_file'));
        } catch (err) {
            console.error(err);
            message.error(t('Errors.save_file_failed_colon') + err);
        }
    };


    /**
     * 另存为文件（示例中采用 prompt 获取新路径）
     */
    const handleSaveAsMenuFile = async () => {
        if (!menuData) {
            message.error(t('Errors.pls_load_file_first'));
            return;
        }
        try {
            let parsedCommands: Command[];
            switch (displayFormat) {
                case "format1":
                    parsedCommands = parseTextAsFormat1(commandsText);
                    break;
                case "format2":
                    parsedCommands = parseTextAsFormat2(commandsText);
                    break;
                case "format3":
                    parsedCommands = parseTextAsFormat3(commandsText);
                    break;
                default:
                    parsedCommands = [];
            }

            const newMenuData = COM3D2.Menu.createFrom({
                Signature: signature,
                BodySize: bodySize,
                Version: version,
                SrcFileName: srcFileName,
                ItemName: itemName,
                Category: category,
                InfoText: infoText,
                Commands: parsedCommands
            });

            const path = await SaveFile("*.menu", t('Infos.com3d2_menu_file'));
            if (path) {
                message.success(t('Infos.success_save_as_file'));
            }

            await SaveMenuFile(path, newMenuData);
            message.success(t('Infos.success_save_as_file'));
        } catch (err) {
            console.error(err);
            message.error(t('Errors.save_as_file_failed_colon') + err);
        }
    };


/**
 * 根据给定 commands 和格式类型，更新编辑器文本
 */
const updateCommandsText = (commands: Command[], fmt: FormatType) => {
    let text;
    let language;
    switch (fmt) {
        case "format1":
            text = commandsToTextFormat1(commands);
            language = "menuFormat1"
            break;
        case "format2":
            text = commandsToTextFormat2(commands);
            language = "menuFormat2"
            break;
        case "format3":
            text = commandsToTextFormat3(commands);
            language = "json"
            break;
        default:
            text = "";
            language = "plaintext"
    }
    setCommandsText(text);
    setLanguage(language)
};


/**
 * 当 displayFormat 改变时，重新生成编辑器文本
 */
useEffect(() => {
    if (menuData && menuData.Commands) {
        updateCommandsText(menuData.Commands, displayFormat);
    }
}, [displayFormat]);


/**
 * 监听 Ctrl+S 快捷键，触发保存
 */
useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Windows/Linux: Ctrl+S, macOS: Cmd+S => e.metaKey
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            handleSaveMenuFile();
        }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
}, [handleSaveMenuFile]);


// 将文件操作方法暴露给父组件
useImperativeHandle(ref, () => ({
    handleReadMenuFile,
    handleSaveMenuFile,
    handleSaveAsMenuFile,
}));


// 只读字段是否可编辑可选框响应
const handleCheckboxChange: CheckboxProps['onChange'] = (e) => {
    setIsInputDisabled(!e.target.checked);
};


return (
    <div style={{padding: 20}}>
        {menuData && (
            <div
            style={{
                height: '100%',
            }}
            >
                {/* 基本字段编辑区 */}
                <div style={{marginBottom: 10}}>
                    <Collapse
                        items={[{
                            key: '1',
                            label: t('MenuEditor.file_header.file_head_usually_no_modify_required'),
                            children: <>
                                <Space direction="vertical" style={{width: '100%'}}>
                                    <Space style={{width: '100%'}}>
                                        <Input addonBefore={t('MenuEditor.file_header.Signature')} value={signature}
                                               disabled={isInputDisabled}
                                               onChange={(e) => setSignature(e.target.value)}/>
                                        <Input addonBefore={t('MenuEditor.file_header.BodySize')} value={bodySize}
                                               disabled={isInputDisabled}
                                               type="number"
                                               onChange={(e) => setBodySize(parseInt(e.target.value, 10))}/>
                                        <Input addonBefore={t('MenuEditor.file_header.Version')} value={version}
                                               disabled={isInputDisabled}
                                               type="number"
                                               onChange={(e) => setVersion(parseInt(e.target.value, 10))}/>
                                        <Checkbox checked={!isInputDisabled}
                                                  onChange={handleCheckboxChange}>{t('MenuEditor.file_header.enable_edit_do_not_edit')}</Checkbox>
                                    </Space>


                                    <Space direction="vertical" style={{width: '100%'}}>
                                        <Input addonBefore={t('MenuEditor.file_header.SrcFileName')} value={srcFileName}
                                               onChange={(e) => setSrcFileName(e.target.value)}
                                               suffix={
                                                   <Tooltip title={t('MenuEditor.file_header.SrcFileName_tip')}>
                                                       <QuestionCircleOutlined/>
                                                   </Tooltip>
                                            }/>
                                        <Input addonBefore={t('MenuEditor.file_header.ItemName')} value={itemName}
                                               onChange={(e) => setItemName(e.target.value)}
                                               suffix={
                                                   <Tooltip title={t('MenuEditor.file_header.ItemName_tip')}>
                                                       <QuestionCircleOutlined/>
                                                   </Tooltip>
                                               }/>
                                        <Input addonBefore={t('MenuEditor.file_header.Category')} value={category}
                                               onChange={(e) => setCategory(e.target.value)}
                                               suffix={
                                            <Tooltip title={t('MenuEditor.file_header.Category_tip')}>
                                                <QuestionCircleOutlined/>
                                            </Tooltip>
                                        }/>
                                        <Input addonBefore={t('MenuEditor.file_header.SetInfoText')} value={infoText}
                                               onChange={(e) => setInfoText(e.target.value)}
                                               suffix={
                                            <Tooltip title={t('MenuEditor.file_header.SetInfoText_tip')}>
                                                <QuestionCircleOutlined/>
                                            </Tooltip>
                                        }/>
                                    </Space>
                                </Space>
                            </>
                        }]}
                    />
                </div>

                {/* Commands 编辑区 */}
                <div style={{marginTop: 10}}>
                    <div style={{marginBottom: 8}}>
                        {/*<span>Commands 显示格式: </span>*/}
                        <Flex vertical gap="middle">
                            <Radio.Group
                                block
                                options={formatOptions}
                                defaultValue="format1"
                                optionType="button"
                                buttonStyle="solid"
                                onChange={(e) => setDisplayFormat(e.target.value)}
                            />
                        </Flex>
                    </div>

                    <div
                        style={{
                            height: 'calc(100vh - 200px)',
                            border: "1px solid #ccc",
                            borderRadius: '8px',   // 添加圆角
                            overflow: 'hidden'     // 隐藏超出圆角范围的部分
                        }}
                    >
                        <Editor
                            height="100vh"
                            width="100%"
                            beforeMount={(monacoInstance) => {
                                // 注册自定义语言 menuFormat1
                                monacoInstance.languages.register({id: "menuFormat1"});
                                monacoInstance.languages.setMonarchTokensProvider("menuFormat1", {
                                    tokenizer: {
                                        root: [
                                            // 如果以一个或多个制表符开头，则视为参数
                                            [/^\t+.+$/, "parameter"],
                                            // 非空且不以制表符开始，则视为命令
                                            [/^[^\t].+$/, "command"],
                                            // 空行
                                            [/^\s*$/, "white"],
                                        ],
                                    },
                                });

                                // 注册自定义语言 menuFormat2
                                monacoInstance.languages.register({id: "menuFormat2"});
                                monacoInstance.languages.setMonarchTokensProvider("menuFormat2", {
                                    tokenizer: {
                                        root: [
                                            // 匹配命令名称：行开头直到遇到冒号（不包含冒号）
                                            [/^[^:]+(?=:)/, "command"],
                                            // 冒号作为分隔符
                                            [/:/, "delimiter"],
                                            // 匹配参数：以逗号或空格分隔
                                            [/\b[^,]+\b/, "parameter"],
                                            // 逗号分隔符
                                            [/[,]/, "delimiter"],
                                            // 空白
                                            [/\s+/, "white"],
                                        ],
                                    },
                                });

                                // 定义编辑器主题 "menuTheme"
                                monacoInstance.editor.defineTheme("menuTheme", {
                                    base: "vs",
                                    inherit: true,
                                    colors: {
                                        "editor.foreground": "#000000",
                                        "editor.background": "#FFFFFF",
                                    },
                                    rules: [
                                        {token: "command", foreground: "#A31515", fontStyle: "bold"},
                                        {token: "parameter", foreground: "#0451A5"},
                                        {token: "delimiter", foreground: "#7B3814"},
                                    ],
                                });
                            }}
                            language={language}
                            theme="menuTheme"
                            value={commandsText}
                            onChange={(value) => setCommandsText(value ?? "")}
                            options={{
                                minimap: {enabled: true},
                                insertSpaces: false,
                                tabSize: 4,
                            }}
                        />
                    </div>
                </div>
            </div>
        )}
    </div>
);
})
;

export default MenuEditor;

/* -----------------------------
 *   utils: 两种 commands 文本格式的转换
 * ----------------------------- */

/**
 * format1:
 *  - 每一条命令用命令名占一行 (即 Arg[0] )，后续参数(Arg[1..])行前有制表符
 *  - 命令之间用空行分割
 *
 * 示例:
 *  CommandName
 *      param1
 *      param2
 *
 *  AnotherCommand
 *      x
 *      y
 */
function commandsToTextFormat1(commands: Command[]): string {
    const lines: string[] = [];
    commands.forEach((cmd) => {
        if (cmd.Args && cmd.Args.length > 0) {
            // 假设 Args[0] 是类似命令名
            lines.push(cmd.Args[0]);
            // 后续参数
            for (let i = 1; i < cmd.Args.length; i++) {
                // 只在这里插入一次制表符
                lines.push("\t" + cmd.Args[i]);
            }
            lines.push(""); // 命令与命令之间空行
        }
    });
    return lines.join("\n").trim();
}

/**
 * format2:
 *  - 每条命令一行: CommandName: param1, param2, ...
 * 示例:
 *  CommandName: param1, param2
 *  AnotherCmd: x, y, z
 */
function commandsToTextFormat2(commands: Command[]): string {
    const lines: string[] = [];
    commands.forEach((cmd) => {
        if (cmd.Args && cmd.Args.length > 0) {
            const commandName = cmd.Args[0];
            const restParams = cmd.Args.slice(1);
            lines.push(`${commandName}: ${restParams.join(", ")}`);
        }
    });
    return lines.join("\n");
}

/**
 * format3: JSON
 *  - 整个 commands 数组转为 JSON，缩进 2 格
 */
function commandsToTextFormat3(commands: Command[]): string {
    return JSON.stringify(commands, null, 2);
}

/**
 * parseTextAsFormat1
 *  - 遇到不以 '\t' 开头的行 => 认为是新的命令 Arg[0]
 *  - 以 '\t' 开头的行 => 认为是当前命令的后续参数
 *  - 空行表示命令结束
 */
function parseTextAsFormat1(text: string): Command[] {
    const lines = text.split(/\r?\n/);
    const commands: Command[] = [];

    let currentArgs: string[] = [];

    function commitArgs() {
        if (currentArgs.length > 0) {
            commands.push({
                ArgCount: currentArgs.length,
                Args: [...currentArgs],
            });
            currentArgs = [];
        }
    }

    for (let line of lines) {
        const trimmed = line.trimEnd(); // 保留左侧缩进判断
        // 空行：提交上一条命令
        if (!trimmed.trim()) {
            commitArgs();
            continue;
        }

        if (trimmed.startsWith("\t")) {
            // 1) 直接去掉开头所有 \t
            const paramText = trimmed.replace(/^\t+/, "");
            currentArgs.push(paramText);
        } else {
            // 2) 新的命令行
            commitArgs();  // 提交上一条命令
            currentArgs.push(trimmed);
        }
    }
    // 最后一条
    commitArgs();

    return commands;
}

/**
 * parseTextAsFormat2
 *  - 每行形如: CommandName: param1, param2, ...
 *  - 冒号分隔 commandName 与后续，用逗号再分隔后续
 */
function parseTextAsFormat2(text: string): Command[] {
    const lines = text.split(/\r?\n/);
    const commands: Command[] = [];

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const colonIndex = trimmed.indexOf(":");
        if (colonIndex < 0) {
            // 没有冒号就跳过或视为只有一个 Arg
            commands.push({
                ArgCount: 1,
                Args: [trimmed],
            });
            continue;
        }
        const commandName = trimmed.substring(0, colonIndex).trim();
        const rest = trimmed.substring(colonIndex + 1).trim();

        let args = [commandName];
        if (rest) {
            const splitted = rest.split(",");
            splitted.forEach((item) => {
                args.push(item.trim());
            });
        }

        commands.push({
            ArgCount: args.length,
            Args: args,
        });
    }
    return commands;
}

/**
 * parseTextAsFormat3
 *  - 期望整个编辑器内容是一个 JSON 数组
 *  - 形如: [ { "ArgCount": 2, "Args": ["Foo", "Bar"] }, ... ]
 */
function parseTextAsFormat3(text: string): Command[] {
    const trimmed = text.trim();
    if (!trimmed) {
        // 空内容 => 空数组
        return [];
    }
    try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
            throw new Error(t('Errors.json_root_node_not_array'));
        }
        // 简单映射为 Command[]
        return parsed.map((item: any) => {
            return {
                ArgCount: item.ArgCount ?? (item.Args ? item.Args.length : 0),
                Args: item.Args ?? [],
            } as Command;
        });
    } catch (err: any) {
        console.error("parseTextAsFormat3 error:", err);
        throw new Error(t('Errors.json_parse_failed') + err.message);
    }
}