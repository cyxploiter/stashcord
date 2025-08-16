import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { ApplicationCommandType } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
    throw new Error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env file');
}

const commands = [
    {
        name: 'Stash It',
        type: ApplicationCommandType.Message,
    },
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
