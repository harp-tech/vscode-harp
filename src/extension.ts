import * as vscode from 'vscode';
import { DevicePreviewProvider } from './devicePreview';

export async function activate(context: vscode.ExtensionContext) {
	// Register our custom preview provider
	var registration = await DevicePreviewProvider.register(context);
	context.subscriptions.push(registration);
}
