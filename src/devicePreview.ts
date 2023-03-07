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
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
            const panel = this.activePanels.get(document.uri);
            if (panel !== undefined) {
                panel.webview.html = this.getHtmlForDocument(document);
            }
        }));
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
        const htmlDevice = this.getHtmlDeviceDescription(deviceMetadata);
        const htmlRegisters = this.getHtmlRegisterDescription(deviceMetadata.registers);
        const htmlBitMasks = this.getHtmlMaskSection('Bit Masks', deviceMetadata.bitMasks, 'bits');
        const htmlGroupMasks = this.getHtmlMaskSection('Group Masks', deviceMetadata.groupMasks, 'values');
        return `
        <!DOCTYPE html>
        <html>
        <body>
            ${htmlDevice}
            ${htmlRegisters}
            ${htmlBitMasks}
            ${htmlGroupMasks}
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

    private getHtmlDeviceDescription(deviceMetadata: any) {
        const deviceAttributes = schema.Query.deviceAttributes(deviceMetadata, this.deviceProperties);
        const deviceTable = this.getHtmlTable(deviceAttributes.keys, deviceAttributes.values);
        return `
            <h1>${deviceMetadata.device}</h1>
            ${deviceTable}
        `;
    }

    private getHtmlRegisterDescription(registers: any) {
        if (registers === undefined) { return ''; }
        const registerAttributes = schema.Query.registerAttributes(registers, this.registerProperties);
        const registerTable = this.getHtmlTable(registerAttributes.keys, registerAttributes.values);
        return `
            <h1>Registers</h1>
            ${registerTable}
        `;
    }

    private getHtmlMaskSection(name: string, masks: any, key: string) {
        if (masks === undefined) { return ''; }
        const maskEntries = Object.entries(masks);
        const maskDescriptions = maskEntries?.map(
            ([name, mask]: [string, any]) => this.getHtmlMaskDescription(name, mask, key));
        return `
            <h1>${name}</h1>
            ${maskDescriptions.join('\n')}
        `;
    }

    private getHtmlMaskDescription(name: string, mask: any, key: string) {
        const maskAttributes = schema.Query.maskAttributes(mask[key]);
        const maskTable = this.getHtmlTable(maskAttributes.keys, maskAttributes.values);
        return `
            <h2>${name}</h2>
            <p>${mask.description}</p>
            ${maskTable}
        `;
    }
}