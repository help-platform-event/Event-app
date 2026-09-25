import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './ms-auth/decorators/public.decorator';
import { MsAuthClient } from './ms-auth-client/ms-auth-client.service';

@Controller('health')
export class HealthController {
    constructor(private readonly msAuthClient: MsAuthClient) {}

    @Public()
    @Get()
    async check() {
        try {
            await this.msAuthClient.checkHealth();
            return { status: 'ok', msAuth: 'up' };
        } catch {
            throw new ServiceUnavailableException({
                status: 'error',
                msAuth: 'down',
            });
        }
    }
}
