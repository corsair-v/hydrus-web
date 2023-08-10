import { HydrusNotes } from './hydrus-notes';
import { HydrusIncDecRatingService, HydrusLikeRatingService, HydrusNumericalRatingService, HydrusServiceSimple, HydrusServiceType, HydrusServices, isIncDecRatingService, isLikeRatingService, isNumericalRatingService, service_string_lookup } from './hydrus-services';
import { HydrusURLInfo } from './hydrus-url';
import { HydrusFiletype } from './hydrus-file-mimes'

export interface ServiceNamesToStatusesToTags {
  [service: string]: StatusesToTags;
}

export interface StatusesToTags {
  [status: string]: string[];
}

export interface HydrusFileService {
  name: string;
  type: HydrusServiceType;
  type_pretty: string;
  time_imported?: number;
  time_deleted?: number;
}

export interface FileFileServices {
  [service_id: string]: {
    time_imported?: number;
    time_deleted?: number;
  };
}

export type HydrusTagServiceType = HydrusServiceType.TAG_REPOSITORY | HydrusServiceType.LOCAL_TAG | HydrusServiceType.COMBINED_TAG;

export interface HydrusTagService {
  name: string;
  type: HydrusTagServiceType;
  type_pretty: string,
  storage_tags: StatusesToTags,
  display_tags: StatusesToTags
}

export interface HydrusBasicFileFromAPI {
  file_id: number;
  hash: string;
  size: number;
  mime: string;
  ext: string;
  width: number;
  height: number;
  duration?: number;
  has_audio: boolean;
  num_frames?: number;
  num_words?: number;
}

interface RatingsFromAPI {
  [service_key: string]: boolean | number | null;
}

export interface HydrusFileFromAPI extends HydrusBasicFileFromAPI {
  known_urls: string[];
  file_services: {
    current?: FileFileServices;
    deleted?: FileFileServices;
  };
  time_modified: number;
  service_names_to_statuses_to_tags?: ServiceNamesToStatusesToTags; // removed in v514
  service_names_to_statuses_to_display_tags?: ServiceNamesToStatusesToTags; // removed in v514
  service_keys_to_statuses_to_tags?: ServiceNamesToStatusesToTags;
  service_keys_to_statuses_to_display_tags?: ServiceNamesToStatusesToTags;
  is_inbox: boolean;
  is_local: boolean;
  is_trashed: boolean;

  notes?: HydrusNotes;

  // added in v506
  // all known tags added in v507
  tags: {
    [serviceKey: string]: HydrusTagService
  }

  detailed_known_urls?: HydrusURLInfo[];

  ipfs_multihashes?: Record<string, string>;

  ratings?: RatingsFromAPI;

  has_exif?: boolean; // added in v506
  has_human_readable_embedded_metadata?: boolean; // added in v506
  has_icc_profile?: boolean; // added in v506

  thumbnail_width?: number; // added in v506
  thumbnail_height?: number; // added in v506

  time_modified_details?: Record<string, number>; // added in v506

  is_deleted?: boolean; // added in v506
}

export type Rating =
  {service_key: string} &
  ((HydrusNumericalRatingService & {value: number | null}) |
  (HydrusLikeRatingService & {value: boolean | null}) |
  (HydrusIncDecRatingService & {value: number}))

export interface HydrusFile extends HydrusFileFromAPI, HydrusBasicFile {
  time_imported?: Date;
  ratings_array?: Rating[]
}

export function generateRatingsArray(ratings: RatingsFromAPI, services: HydrusServices) {
  return Object.entries(ratings).map(([service_key, value]) => {
    const service = {service_key, ...services[service_key]}
    if (isNumericalRatingService(service)) {
      return {
        ...service,
        value: value as number | null
      }
    } else if (isLikeRatingService(service)) {
      return {
        ...service,
        value: value as boolean | null
      }
    } else if (isIncDecRatingService(service)) {
      return {
        ...service,
        value: value as number
      }
    } else {
      return null;
    }
  })
}

export interface HydrusBasicFile extends HydrusBasicFileFromAPI {
  file_url: string;
  thumbnail_url: string;
  file_category: FileCategory;
  file_type: HydrusFiletype;
  file_type_string: string;
  has_thumbnail: boolean;
}

export interface HydrusFileList {
    [fileId: number]: HydrusFile;
}

export enum FileCategory {
  Image,
  Video,
  Audio,
  Flash,
  Unsupported
}

export enum TagStatus {
  Current = 0,
  Pending = 1,
  Deleted = 2,
  Petitioned = 3,
}

export function getFileCategory(type: HydrusFiletype): FileCategory {
  if ([
    HydrusFiletype.IMAGE_JPEG,
    HydrusFiletype.IMAGE_PNG,
    HydrusFiletype.IMAGE_APNG,
    HydrusFiletype.IMAGE_GIF,
    HydrusFiletype.IMAGE_BMP,
    HydrusFiletype.IMAGE_WEBP,
    HydrusFiletype.IMAGE_SVG,
    HydrusFiletype.IMAGE_HEIF,
    HydrusFiletype.IMAGE_HEIF_SEQUENCE,
    HydrusFiletype.IMAGE_HEIC,
    HydrusFiletype.IMAGE_HEIC_SEQUENCE,
    HydrusFiletype.IMAGE_AVIF,
    HydrusFiletype.IMAGE_AVIF_SEQUENCE,
  ].includes(type)) {
    return FileCategory.Image;
  }
  if ([
    HydrusFiletype.VIDEO_MP4,
    HydrusFiletype.VIDEO_WEBM,
    HydrusFiletype.VIDEO_MKV,
    HydrusFiletype.VIDEO_MOV,
  ].includes(type)) {
    return FileCategory.Video;
  }
  if ([
    HydrusFiletype.AUDIO_MP3,
    HydrusFiletype.AUDIO_OGG,
    HydrusFiletype.AUDIO_FLAC,
    HydrusFiletype.AUDIO_WAVE,
  ].includes(type)) {
    return FileCategory.Audio;
  }
  if ([
    HydrusFiletype.APPLICATION_FLASH,
    HydrusFiletype.VIDEO_FLV
  ].includes(type)) {
    return FileCategory.Flash;
  }
  return FileCategory.Unsupported;
}
