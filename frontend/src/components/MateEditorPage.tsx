// frontend/src/components/MenuEditorPage.tsx
import React, {useRef} from "react";
import {useLocation} from "react-router-dom";
import {Layout} from "antd";
import NavBar from "./NavBar";
import {useTranslation} from "react-i18next";
import MateEditor, {MateEditorRef} from "./MateEditor";
import useFileHandlers from "../hooks/fileHanlder";
import {COM3D2} from "../../wailsjs/go/models";
import FileInfo = COM3D2.FileInfo;

const {Content} = Layout;

const MateEditorPage: React.FC = () => {
    const {t} = useTranslation();
    const location = useLocation();
    const {handleSelectFile, handleSaveFile, handleSaveAsFile} = useFileHandlers();

    // 从路由 state 中获取 fileInfo
    const state = location.state as { fileInfo: FileInfo } | undefined;
    const fileInfo = state?.fileInfo;

    // 用 ref 获取 mateEditorRef 实例
    const mateEditorRef = useRef<MateEditorRef>(null);

    return (
        <Layout style={{height: "100vh"}}>
            <NavBar
                onSelectFile={() => handleSelectFile("*.mate;*.mate.json", t('Infos.com3d2_mate_file'))}
                onSaveFile={() => handleSaveFile(mateEditorRef)}
                onSaveAsFile={() => handleSaveAsFile(mateEditorRef)}
            />
            <Content style={{padding: 0, overflow: "auto"}}>
                <MateEditor fileInfo={fileInfo} ref={mateEditorRef}/>
            </Content>
        </Layout>
    );
};

export default MateEditorPage;
