import * as vscode from 'vscode';
import { parse } from 'yaml';

export class DevicePreviewProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new DevicePreviewProvider(context);
        const callback = async () => provider.resolvePreviewPanel();
        return vscode.commands.registerCommand('harp.device.sidePreview', callback);
    }

    private readonly activePanels = new Map<vscode.Uri, vscode.WebviewPanel>();

    constructor (
        private readonly context: vscode.ExtensionContext
    ) { }

    public async resolvePreviewPanel() {
        let activeDocument = vscode.window.activeTextEditor?.document;
        if (activeDocument === undefined) {
            return;
        }

        const uri = activeDocument.uri;
        var panel = this.activePanels.get(uri);
        if (panel === undefined) {
            const fileName = uri.path.split('/').pop();
            panel = vscode.window.createWebviewPanel(
                'harpDevicePreview',
                `Device Preview [${fileName}]`,
                vscode.ViewColumn.Two
            );
            this.activePanels.set(uri, panel);
            panel.onDidDispose(() => this.activePanels.delete(uri));
            panel.webview.html = this.getHtmlForDocument(activeDocument);
        }

        panel.reveal();
    }

    private getHtmlForDocument(document: vscode.TextDocument): string {
        const content = document.getText();
        const deviceMetadata = parse(content);
        return `
        <!DOCTYPE html>
        <html>
        <body>
            <h1>${deviceMetadata.device}</h1>
        </body>
        </html>`;
    }
}