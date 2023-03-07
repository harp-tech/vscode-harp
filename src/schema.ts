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

    private static readonly maskAttributeNames = ['name', 'value', 'description'];

    private static toHexString(value: any): string {
        return "0x" + (+(value)).toString(16);
    }

    public static maskAttributes(maskValues: any) {
        return new QueryResult(
            Query.maskAttributeNames,
            Object.entries(maskValues).map(([name, value]: [string, any]) => [name, ...typeof value !== 'object'
                ? [this.toHexString(value), '']
                : Object.entries(value).map(
                    ([key, value], i) => i === 0 ? this.toHexString(key) : value)]));
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