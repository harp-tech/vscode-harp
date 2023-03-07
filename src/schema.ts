import * as vscode from 'vscode';
import { parse } from 'yaml';

export class Parser {
    public static async readSchema(uri: vscode.Uri): Promise<Object> {
        const fileContents = await vscode.workspace.fs.readFile(uri);
        return parse(fileContents.toString());
    }

    public static deviceProperties(schema: any) {
        const deviceProperties = schema.allOf[0].properties;
        const keys = Object.keys(deviceProperties).filter(key => !['device', 'registers'].includes(key));
        return keys.map(key => new Property(key));
    }

    public static registerProperties(schema: any) {
        const registerProperties = schema.definitions.register.properties;
        const keys = Object.keys(registerProperties);
        return keys.map(key => new Property(key));
    }
}

export class Query {
    public static deviceAttributes(deviceMetadata: any, properties: Property[]) {
        return new QueryResult(
            undefined,
            properties.map(prop => [prop.name, prop.name in deviceMetadata
                ? deviceMetadata[prop.name]
                : prop.defaultValue]));
    }

    public static registerAttributes(registerMetadata: any, properties: Property[]) {
        const registers = Object.entries(registerMetadata);
        const registerData = registers.map(([name, register]: [string, any]) =>
            [name,...properties.map(key => key.name in register ? register[key.name] : key.defaultValue)]);
        const registerKeys = ['name',...properties.map(key => key.name.endsWith('Value')
            ? key.name.substring(0, key.name.indexOf('Value')) : key.name)];
        return new QueryResult(registerKeys, registerData);
    }
}

export class Property {
    constructor(
        public readonly name: string,
        public readonly defaultValue: string = ''
    ) { }
}

export class QueryResult {
    constructor(
        public readonly keys: string[] | undefined,
        public readonly values: any[][]
    ) { }
}