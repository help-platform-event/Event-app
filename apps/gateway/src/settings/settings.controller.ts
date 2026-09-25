import { Body, Controller, Get, Logger, Patch, Post } from '@nestjs/common';
import { MsAuthClient } from '../ms-auth-client/ms-auth-client.service';
import { AccessToken } from '../ms-auth/decorators/access-token.decorator';
import { User } from '../ms-auth/decorators/user.decorator';
import {
    AvailabilityDto,
    availabilitySchema,
    ChangePasswordDto,
    ChangePasswordSchema,
    NotificationsDto,
    notificationsSchema,
    ProfileDto,
    profileSchema,
} from '@app/contracts';
import { ZodValidationPipe } from '../utils/zod-validation.pipe';
import { GeoapifyService } from '../geoapify/geoapify.service';

@Controller('me')
export class SettingsController {
    private readonly logger = new Logger(SettingsController.name);

    constructor(
        private readonly msAuthClient: MsAuthClient,
        private readonly geoapifyService: GeoapifyService,
    ) {}

    //PROFILE
    @Get('profile')
    async getProfile(@AccessToken() accessToken: string) {
        return this.msAuthClient.getProfile(accessToken);
    }

    @Patch('profile')
    async updateProfile(
        @User('id') userId: string,
        @AccessToken() accessToken: string,
        @Body(ZodValidationPipe(profileSchema)) body: ProfileDto,
    ) {
        const enrichedBody = await this.enrichAddressWithCoordinates(
            body,
            userId,
        );

        return this.msAuthClient.updateProfile(accessToken, enrichedBody);
    }

    private async enrichAddressWithCoordinates(
        body: ProfileDto,
        userId: string,
    ): Promise<ProfileDto> {
        if (!body.address) return body;

        try {
            const coordinates = await this.geoapifyService.geocodeAddress({
                street_number: body.address.streetNumber,
                street_name: body.address.streetName,
                address_line_2: body.address.addressLine2,
                postal_code: body.address.postalCode,
                city: body.address.city,
                country: body.address.country,
            });

            return {
                ...body,
                address: {
                    ...body.address,
                    coordinates: coordinates ?? undefined,
                },
            };
        } catch (error) {
            // Le geocoding est tolerant aux pannes : on sauvegarde le profil
            // sans coordonnees plutot que de bloquer toute la mise a jour.
            this.logger.warn(
                `Geocoding echoue pour userId=${userId}, profil sauvegarde sans coordinates`,
                error instanceof Error ? error.message : error,
            );

            return body;
        }
    }

    // AVAILABILITY
    @Get('availability')
    async getAvailability(@AccessToken() accessToken: string) {
        return this.msAuthClient.getAvailability(accessToken);
    }

    @Patch('availability')
    async updateAvailability(
        @AccessToken() accessToken: string,
        @Body(ZodValidationPipe(availabilitySchema)) body: AvailabilityDto,
    ) {
        return this.msAuthClient.updateAvailability(accessToken, body);
    }

    // NOTIFICATIONS
    @Get('notifications')
    async getNotifications(@AccessToken() accessToken: string) {
        return this.msAuthClient.getNotifications(accessToken);
    }

    @Patch('notifications')
    async updateNotifications(
        @AccessToken() accessToken: string,
        @Body(ZodValidationPipe(notificationsSchema)) body: NotificationsDto,
    ) {
        return this.msAuthClient.updateNotifications(accessToken, body);
    }

    // PASSWORDCHANGE
    @Post('password')
    async changePassword(
        @AccessToken() accessToken: string,
        @Body(ZodValidationPipe(ChangePasswordSchema)) body: ChangePasswordDto,
    ): Promise<void> {
        await this.msAuthClient.changePassword(accessToken, body);
    }
}
