import {GetAppVersion} from "../../wailsjs/go/main/App";

export const AppVersion = await GetAppVersion()

export const LastUpdateCheckTimeKey = "LastUpdateCheckTimeKey"; // 存储上次检查时间的键

export const NewVersionAvailableKey = "NewVersionAvailableKey"; // 存储新版本是否可用的键

export const LatestVersionKey = "LatestVersionKey" // 存储最新版本号的键

export const UpdateCheckInterval = 24 * 60 * 60 * 1000; // 检查更新的间隔 24 小时（毫秒）

export const RetryInterval = 1 * 60 * 60 * 1000; // 重试检查更新间隔 1 小时（毫秒）

export const SettingCheckUpdateKey = "SettingCheckUpdateKey"; // 检查更新设置的键

export const GitHubUrl = "https://github.com/90135/COM3D2_MOD_EDITOR"; // GitHub 仓库地址

export const GitHubReleaseUrl = "https://github.com/90135/COM3D2_MOD_EDITOR/releases"; // GitHub 仓库的发布页面地址

export const ChineseMODGuideUrl = "https://github.com/90135/COM3D2_Simple_MOD_Guide_Chinese" // 中文 MOD 教程，简明 MOD 教程

export const ImageMagickUrl = "https://imagemagick.org/script/download.php"