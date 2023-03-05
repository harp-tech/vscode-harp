import * as vscode from 'vscode';
import { DevicePreviewProvider } from './devicePreview';

export function activate(context: vscode.ExtensionContext) {
	// Register our custom preview provider
	context.subscriptions.push(DevicePreviewProvider.register(context));
}
