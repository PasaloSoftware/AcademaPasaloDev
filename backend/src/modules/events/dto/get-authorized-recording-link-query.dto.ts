import { IsIn, IsOptional } from 'class-validator';
import { MEDIA_VIDEO_LINK_MODES } from '@modules/media-access/domain/media-access.constants';
import type { MediaVideoLinkMode } from '@modules/media-access/domain/media-access.constants';

export class GetAuthorizedRecordingLinkQueryDto {
  @IsOptional()
  @IsIn([MEDIA_VIDEO_LINK_MODES.EMBED, MEDIA_VIDEO_LINK_MODES.DIRECT])
  mode?: MediaVideoLinkMode;
}
