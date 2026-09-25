import { Global, Module } from '@nestjs/common';
import { MsAuthClient } from './ms-auth-client.service';

/**
 * Global : AppModule ré-enregistre `AuthController`/`HealthController` en plus de leurs
 * modules, donc le client doit être résolvable partout sans import explicite.
 */
@Global()
@Module({
    providers: [MsAuthClient],
    exports: [MsAuthClient],
})
export class MsAuthClientModule {}
