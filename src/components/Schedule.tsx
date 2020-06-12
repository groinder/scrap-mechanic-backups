import React, { FC, useState, useRef, useEffect, useCallback } from "react";
import { Button, NumericInput, Label, Card, NonIdealState, Checkbox, Classes } from "@blueprintjs/core"
import { remote } from "electron";
import { join, basename } from 'path'
import { readdirSync, Dirent, unlinkSync, existsSync } from 'fs'
import AdmZip from 'adm-zip'
import cron, { ScheduledTask } from "node-cron"
import sanitize from "sanitize-filename";
import watch from "node-watch";

const getDirectories = (source: string) =>
    readdirSync(source, { withFileTypes: true })
        .filter((dirent: Dirent) => dirent.isDirectory())
        .map((dirent: Dirent) => dirent.name)

const scrapMechanicPath = [process.env.APPDATA, "Axolot Games", "Scrap Mechanic", "User"];

const maxStoredBackups = 12;

export const Schedule: FC = () => {
    const cronRef = useRef<ScheduledTask>(null);
    const filesUpdatedRef = useRef<boolean>(false);
    const watcherRef = useRef<ReturnType<typeof watch>>(null)
    const [perioid, setPerioid] = useState<number>(1);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [openAtLogin, setOpenAtLogin] = useState<boolean>(remote.app.getLoginItemSettings().openAtLogin);
    const [backupsDirectory, setBackupsDirectory] = useState<string>();

    useEffect(() => {
        const storedPerioid = localStorage.getItem('perioid');
        const minutes = storedPerioid ? parseInt(storedPerioid, 10) : 5;
        const storedSaveFiles = localStorage.getItem('saveFiles');
        const files = storedSaveFiles ? JSON.parse(storedSaveFiles) : []
        const backupsDir = localStorage.getItem('backupsDirectory');
        const dir = backupsDir || remote.process.cwd();

        setPerioid(minutes);
        setSelectedFiles(files);
        setBackupsDirectory(dir);
        setCron(minutes, files, dir);
    }, [])

    const handleFileSelection = async () => {
        const userDirectory = getDirectories(join(...scrapMechanicPath))[0];
        const saveDirectory = [...scrapMechanicPath, userDirectory, "Save", "Survival"]

        const { filePaths } = await remote.dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], defaultPath: join(...saveDirectory), filters: [{ name: "Scrap Mechanic Save", extensions: ["db"] }] });

        if (filePaths.length) {
            setSelectedFiles(filePaths);
        }
    }

    const handleDirectorySelection = useCallback(async () => {
        const { filePaths } = await remote.dialog.showOpenDialog({ properties: ['openDirectory'], defaultPath: backupsDirectory });

        if (filePaths.length) {
            const backupsDir = filePaths[0];
            setBackupsDirectory(backupsDir);
        }
    }, [backupsDirectory])

    const makeBackup = (saveFiles: string[], backupsDir: string) => {
        if (saveFiles.length && filesUpdatedRef.current) {
            const archivesJSON = localStorage.getItem('archives');
            let archives = archivesJSON ? JSON.parse(archivesJSON) : [];
            if (archives.length === maxStoredBackups) {
                const archivePath = join(backupsDir, archives[0]);
                if (existsSync(archivePath)) {
                    unlinkSync(archivePath);
                }
                archives = archives.slice(1)
            }

            const zip = new AdmZip();
            saveFiles.forEach(filePath => {
                zip.addLocalFile(filePath)
            });
            const archiveName = `backup-${sanitize((new Date()).toISOString())}.zip`;
            zip.writeZip(join(backupsDir, archiveName), (err) => {
                if (!err) {
                    localStorage.setItem('archives', JSON.stringify([...archives, archiveName]))
                    filesUpdatedRef.current = false;
                }
                console.log(err)
            });
        }
    }

    const handlePerioidChange = (value: number) => {
        setPerioid(value)
    }

    const setCron = (minutes: number, saveFiles: string[], backupsDir: string) => {
        if (cronRef.current) {
            cronRef.current.destroy()
        }

        if (watcherRef.current) {
            watcherRef.current.close();
        }

        if (saveFiles.length) {
            watcherRef.current = watch(saveFiles, () => {
                filesUpdatedRef.current = true;
            });

            cronRef.current = cron.schedule(`*/${minutes} * * * *`, () => {
                makeBackup(saveFiles, backupsDir);
            });
        }
    }

    const handleApply = useCallback(() => {
        setCron(perioid, selectedFiles, backupsDirectory);
        localStorage.setItem('perioid', perioid.toString());
        localStorage.setItem('saveFiles', JSON.stringify(selectedFiles));
        localStorage.setItem('backupsDirectory', backupsDirectory);
    }, [setCron])

    const handleOpenAtLoginChange = () => {
        const newOpenAtLogin = !openAtLogin;
        setOpenAtLogin(newOpenAtLogin);
        remote.app.setLoginItemSettings({
            openAtLogin: newOpenAtLogin
        });
    }

    const noSelectedFiles = !selectedFiles.length;


    return (
        <div className="bp3-dark">
            <Card elevation={1} className="main-grid">
                <div>
                    <h3 className="bp3-heading">Backups directory:</h3>
                    <Card className="flex-between">{backupsDirectory} <Button onClick={handleDirectorySelection}>Choose backups directory</Button></Card>
                </div>
                <div>
                    <h3 className="bp3-heading">Selected save files:</h3>
                    <div className="files-grid">
                        <div>
                            {noSelectedFiles && <Card><NonIdealState title="You didn't select any save files." /></Card>}
                            {selectedFiles.map(filePath => (
                                <Card key={filePath}>{basename(filePath)}</Card>
                            ))}
                        </div>

                        <Button fill onClick={handleFileSelection}>Choose save files</Button>
                    </div>
                </div>

                <Label>
                    Make backup every (minutes):
                <NumericInput value={perioid} onValueChange={handlePerioidChange} />
                </Label>
                <Button disabled={noSelectedFiles || perioid <= 0} onClick={handleApply}>Apply</Button>
                <div>
                    <h3 className="bp3-heading">Misc (saves automatically, no need to click apply):</h3>
                    <Checkbox checked={openAtLogin} onChange={handleOpenAtLoginChange} label="Open minimized at login" />
                </div>
            </Card>

        </div>
    )
}