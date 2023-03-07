import * as vscode from 'vscode';
import { parse } from 'yaml';
import * as schema from './schema';

export class DevicePreviewProvider {

    public static async register(context: vscode.ExtensionContext): Promise<vscode.Disposable> {
        const deviceSchemaUri = vscode.Uri.joinPath(context.extensionUri, 'assets', 'device.json');
        const registerSchemaUri = vscode.Uri.joinPath(context.extensionUri, 'assets', 'registers.json');
        const deviceSchema = await schema.Parser.readSchema(deviceSchemaUri);
        const registerSchema = await schema.Parser.readSchema(registerSchemaUri);

        const provider = new DevicePreviewProvider(context, deviceSchema, registerSchema);
        const callback = async () => provider.resolvePreviewPanel();
        return vscode.commands.registerCommand('harp.device.sidePreview', callback);
    }

    private readonly activePanels = new Map<vscode.Uri, vscode.WebviewPanel>();
    private readonly deviceProperties: schema.Property[];
    private readonly registerProperties: schema.Property[];

    constructor (
        private readonly context: vscode.ExtensionContext,
        deviceSchema: any,
        registerSchema: any
    )
    {
        this.deviceProperties = schema.Parser.deviceProperties(deviceSchema);
        this.registerProperties = schema.Parser.registerProperties(registerSchema);
    }

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
        const deviceAttributes = schema.Query.deviceAttributes(deviceMetadata, this.deviceProperties);
        const deviceTable = this.getHtmlTable(deviceAttributes.keys, deviceAttributes.values);

        const registerAttributes = schema.Query.registerAttributes(deviceMetadata.registers, this.registerProperties);
        const registerTable = this.getHtmlTable(registerAttributes.keys, registerAttributes.values);
        return `
        <!DOCTYPE html>
        <html>
        <body>
            <h1>${deviceMetadata.device}</h1>
            ${deviceTable}
            <h1>Registers</h1>
            ${registerTable}
        </body>
        </html>`;
    }

    private getHtmlTable(keys: string[] | undefined, data: any[][]) {
        const tableRow = (content: string) => `<tr>\n${content}</tr>\n`;
        const tableData = (attributes: any[]) => tableRow(attributes.reduce<string>(
            (content, value) => (content + `<td>${value}</td>`), ''));
        let tableHeading = keys === undefined ? '' :
            tableRow(keys.reduce((content, key) => (content + `<th>${key}</th>`), ''));
        return `
            <div style="overflow-x:auto;">
                <table>
                    ${tableHeading}
                    ${data.reduce((content, attributes) => (content + tableData(attributes)), '')}
                </table>
            </div>`;
    }
}