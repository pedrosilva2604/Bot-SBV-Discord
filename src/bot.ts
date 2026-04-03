import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Invite,
  Guild,
  GuildMember,
} from "discord.js";
import { MemberJoinedDto, ResponseDto } from "./DTO/DTOs-bot";
import axios from "axios";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
  ],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN as string;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL as string;

// Mapa de GuildID -> Map de InviteCode -> Uses
const inviteCache = new Map<string, Map<string, number>>();

export interface IInviteCache {
  fetch(guild: Guild): Promise<ResponseDto>;
  addInvite(guildId: string, code: string, uses: number): Promise<ResponseDto>;
  get(guildId: string): Map<string, number>;
}

export interface IWebhookService {
  send(data: MemberJoinedDto): Promise<ResponseDto>;
}

export interface IBotService {
  handleInviteCreate(invite: Invite): Promise<ResponseDto>;
  handleMemberJoin(member: GuildMember): Promise<MemberJoinedDto>;
}

export interface IDiscordBot {
  start(): void;
}

export class InviteCache implements IInviteCache {
  constructor(private readonly cache: Map<string, Map<string, number>>) {}

  public get(guildId: string): Map<string, number> {
    return this.cache.get(guildId) || new Map<string, number>();
  }

  async addInvite(
    guildId: string,
    code: string,
    uses: number,
  ): Promise<ResponseDto> {
    try {
      const guildCache = this.get(guildId);
      guildCache.set(code, uses);
      this.cache.set(guildId, guildCache);
      return { statusCode: 200, message: `Invite ${code} cacheado.` };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async fetch(guild: Guild): Promise<ResponseDto> {
    try {
      const invites = await guild.invites.fetch();
      const guildMap = new Map<string, number>();
      invites.forEach((inv) => guildMap.set(inv.code, inv.uses ?? 0));
      this.cache.set(guild.id, guildMap);
      return {
        statusCode: 200,
        message: `Cache atualizado para ${guild.name}`,
      };
    } catch (error: any) {
      console.error(
        `Erro ao buscar invites na guilda ${guild.id}:`,
        error.message,
      );
      return { statusCode: 500, message: error.message };
    }
  }
}

export class WebhookService implements IWebhookService {
  constructor(private readonly webhookUrl: string) {}

  async send(data: MemberJoinedDto): Promise<ResponseDto> {
    try {
      const response = await axios.post(this.webhookUrl, data);
      return {
        statusCode: response.status,
        message: response.data.message ?? "Webhook enviado com sucesso",
      };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }
}

export class BotService implements IBotService {
  constructor(
    private readonly inviteCache: IInviteCache,
    private readonly webhookService: IWebhookService,
  ) {}

  async handleInviteCreate(invite: Invite): Promise<ResponseDto> {
    return await this.inviteCache.addInvite(
      invite.guild?.id ?? "",
      invite.code,
      invite.uses ?? 0,
    );
  }

  async handleMemberJoin(member: GuildMember): Promise<MemberJoinedDto> {
    const { guild } = member;

    // 1. Buscamos o estado ATUAL da API e o que tínhamos no CACHE
    const currentInvites = await guild.invites.fetch();
    const cachedInvites = this.inviteCache.get(guild.id);

    let usedInviteCode = "unknown";

    // --- LÓGICA PARA CONVITES ÚNICOS (QUE SOMEM) ---
    // Procuramos no cache um código que NÃO existe mais na API atual
    for (const [code, uses] of cachedInvites) {
      if (!currentInvites.has(code)) {
        usedInviteCode = code;
        break;
      }
    }

    // --- LÓGICA DE BACKUP (CONVITES REUTILIZÁVEIS) ---
    // Se não achou um que sumiu, procura qual aumentou o contador
    if (usedInviteCode === "unknown") {
      for (const [code, invite] of currentInvites) {
        const previousUses = cachedInvites.get(code) || 0;
        if ((invite.uses ?? 0) > previousUses) {
          usedInviteCode = code;
          break;
        }
      }
    }

    // 2. ATUALIZAÇÃO CRÍTICA DO CACHE
    // Limpamos o cache e colocamos o estado atual da API para o próximo join
    await this.inviteCache.fetch(guild);

    const payload: MemberJoinedDto = {
      event: "member_joined",
      invite_code: usedInviteCode,
      user_id: member.id,
      username: member.user.username,
      joined_at: new Date(),
      role_id: member.roles.highest.id,
    };

    console.log(
      `Usuário ${member.user.username} entrou com o código: ${usedInviteCode}`,
    );

    const response = await this.webhookService.send(payload);
    console.log(
      `[${response.statusCode}] ${response.message} — ${member.user.username}`,
    );

    return payload;
  }
}
export class DiscordBot implements IDiscordBot {
  constructor(
    private readonly client: Client,
    private readonly botService: IBotService,
    private readonly inviteCache: IInviteCache,
  ) {}

  start(): void {
    this.client.once("ready", async () => {
      console.log(`Bot logado como ${this.client.user?.tag}`);
      // Inicializa o cache para todos os servidores que o bot está
      for (const guild of this.client.guilds.cache.values()) {
        await this.inviteCache.fetch(guild);
      }
    });

    this.client.on("inviteCreate", async (invite: Invite) => {
      await this.botService.handleInviteCreate(invite);
    });

    this.client.on("guildMemberAdd", async (member: GuildMember) => {
      await this.botService.handleMemberJoin(member);
    });

    this.client.login(DISCORD_TOKEN);
  }
}

// Instanciação
const cache = new InviteCache(inviteCache);
const webhookService = new WebhookService(N8N_WEBHOOK_URL);
const botService = new BotService(cache, webhookService);
const bot = new DiscordBot(client, botService, cache);

bot.start();
