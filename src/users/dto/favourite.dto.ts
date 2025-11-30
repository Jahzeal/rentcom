// DTO for the POST (Add Favorite) request
import { IsString } from 'class-validator';
export class CreateFavoriteDto {
  /**
   * The unique ID of the listing/rental the user wants to favorite.
   */
  @IsString()
  propertyId: string;
}
