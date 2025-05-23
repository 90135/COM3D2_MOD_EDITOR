// frontend/src/components/AnmEditorPage.tsx
import React, {useRef} from "react";
import {useLocation} from "react-router-dom";
import {Layout} from "antd";
import NavBar from "./NavBar";
import {useTranslation} from "react-i18next";
import useFileHandlers from "../hooks/fileHanlder";
import AnmEditor, {AnmEditorRef} from "./AnmEditor";
import {COM3D2} from "../../wailsjs/go/models";
import FileInfo = COM3D2.FileInfo;

const {Content} = Layout;

const AnmEditorPage: React.FC = () => {
    const {t} = useTranslation();
    const location = useLocation();
    const {handleSelectFile, handleSaveFile, handleSaveAsFile} = useFileHandlers();

    // 从路由 state 中获取 fileInfo
    const state = location.state as { fileInfo: FileInfo } | undefined;
    const fileInfo = state?.fileInfo;

    // 用 ref 获取 anmEditorRef 实例
    const anmEditorRef = useRef<AnmEditorRef>(null);

    return (
        <Layout style={{height: "100vh"}}>
            <NavBar
                onSelectFile={() => handleSelectFile("*.;*.anm.json", t('Infos.com3d2_anm_file'))}
                onSaveFile={() => handleSaveFile(anmEditorRef)}
                onSaveAsFile={() => handleSaveAsFile(anmEditorRef)}
            />
            <Content style={{padding: 0, overflow: "auto"}}>
                <AnmEditor fileInfo={fileInfo} ref={anmEditorRef}/>
            </Content>
        </Layout>
    );
};

export default AnmEditorPage;
