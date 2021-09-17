import { App, GenericMessageEvent } from '@slack/bolt';

const app = new App({
        token: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.message('hello', async params => {
        console.log('received message');
        if (params.message.subtype === undefined) {
                const msg = params.message as GenericMessageEvent;
                await params.say(`Hey there <@${msg.user}>!`);
        }
});

(async () => {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        await app.start(port);
        console.log('⚡️ Bolt app is running!');
})();
