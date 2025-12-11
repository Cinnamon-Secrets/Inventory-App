const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, payload) {
    return ipcRenderer.invoke(channel, payload).catch(error => {
        console.error(`IPC call failed for ${channel}`, error);
        throw error;
    });
}

contextBridge.exposeInMainWorld('api', {
    loadSnapshot: () => invoke('data:load'),
    saveSnapshot: snapshot => invoke('data:save', snapshot),
    listArchives: (limit = 20) => invoke('data:list-archives', limit),
    restoreArchive: archiveId => invoke('data:restore-archive', archiveId)
});
