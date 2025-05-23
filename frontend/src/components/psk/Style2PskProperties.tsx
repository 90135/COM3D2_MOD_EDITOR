import React, {useEffect, useRef, useState} from "react";
import {Editor} from "@monaco-editor/react";
import {useDarkMode} from "../../hooks/themeSwitch";
import {COM3D2} from "../../../wailsjs/go/models";
import {cancelJsonSchemaValidation} from "../../utils/utils";
import Psk = COM3D2.Psk;

/** 直接用 Monaco Editor 展示/编辑整个 JSON */
const Style2PskProperties: React.FC<{
    pskData: Psk | null;
    setPskData: (a: Psk | null) => void;
}> = ({pskData, setPskData}) => {
    const isDarkMode = useDarkMode();
    const [jsonValue, setJsonValue] = useState("");
    const editorRef = useRef<any>(null);
    const isInternalUpdate = useRef(false);
    const prevPskDataRef = useRef<string | null>(null);

    // 处理 PskData 的外部更新（如文件加载）
    useEffect(() => {
        if (pskData) {
            const pskDataJson = JSON.stringify(pskData);
            // Only update if this is an external change, not from our editor
            if (!isInternalUpdate.current && pskDataJson !== prevPskDataRef.current) {
                setJsonValue(JSON.stringify(pskData, null, 2));
                prevPskDataRef.current = pskDataJson;
            }
        } else {
            setJsonValue("");
            prevPskDataRef.current = null;
        }
    }, [pskData]);

    // 初始化第一次渲染
    useEffect(() => {
        if (pskData) {
            setJsonValue(JSON.stringify(pskData, null, 2));
            prevPskDataRef.current = JSON.stringify(pskData);
        }
    }, []);

    // Handle the editor being mounted
    const handleEditorDidMount = (editor: any, monacoInstance: any) => {
        editorRef.current = editor;
        cancelJsonSchemaValidation(monacoInstance);
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
            if (JSON.stringify(parsed) !== JSON.stringify(pskData)) {
                isInternalUpdate.current = true;
                setPskData(parsed);
                prevPskDataRef.current = JSON.stringify(parsed);

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
            height: "calc(100vh - 90px)",
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


export default Style2PskProperties;