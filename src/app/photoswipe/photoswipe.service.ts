import { Injectable, ApplicationRef, Injector, ComponentFactoryResolver, ComponentRef, ElementRef } from '@angular/core';
import { PhotoswipeComponent } from './photoswipe.component';
import * as PhotoSwipe from 'photoswipe';
import * as PhotoSwipeUI_Default from 'photoswipe/dist/photoswipe-ui-default';
import { HydrusFile, HydrusFileType } from '../hydrus-file';
import { fromEvent, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


interface PhotoSwipeItemWithPID extends PhotoSwipe.Item {
  pid?: string | number;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoswipeService {

  private photoswipeComponent: ComponentRef<PhotoswipeComponent>;
  private pspElement: ElementRef;

  ps: PhotoSwipe<{}>;

  public onMouseWheel$: Observable<WheelEvent>;
  public onMouse$: Observable<MouseEvent>;
  public psClose$ = new Subject();

  constructor(private applicationRef: ApplicationRef, private injector: Injector, private resolver: ComponentFactoryResolver) {
    this.photoswipeComponent = this.resolver.resolveComponentFactory(PhotoswipeComponent).create(this.injector);
    this.pspElement = this.photoswipeComponent.instance.pspElement;
    this.applicationRef.attachView(this.photoswipeComponent.hostView);
    document.body.appendChild(this.photoswipeComponent.location.nativeElement);

    this.onMouseWheel$ = fromEvent<WheelEvent>(this.photoswipeComponent.location.nativeElement, 'wheel');
    this.onMouse$ = fromEvent<MouseEvent>(this.photoswipeComponent.location.nativeElement, 'auxclick');
  }

  getPhotoSwipeItems(items : HydrusFile[]) : PhotoSwipeItemWithPID[] {
    return items.map((i) => this.getPhotoSwipeItem(i));
  }

  getPhotoSwipeItem(file: HydrusFile) : PhotoSwipeItemWithPID {
    if(file.file_type === HydrusFileType.Image) {
      return {
        src: file.file_url,
        msrc: file.thumbnail_url,
        w: file.width,
        h: file.height,
        pid: file.file_id
      };
    } else if(file.file_type === HydrusFileType.Video) {
      return {
        html: `
        <div id="pswp-video-${file.file_id}" class="pswp-video-container">
        <img src="${file.thumbnail_url}" class="pswp-video-placeholder">
        </div>
        `,
        pid: file.file_id
      };
    } else {
      return {
        html: `<div class="pswp__error-msg">
        The file could not be loaded. (type: ${file.mime})
        </div>`,
        pid: file.file_id
      };
    }
  }

  public openPhotoSwipe(items : HydrusFile[], id: number) {
    let imgindex = items.findIndex(e => e.file_id == id);

    let ps = new PhotoSwipe(this.pspElement.nativeElement, PhotoSwipeUI_Default, this.getPhotoSwipeItems(items),
    {
      index: imgindex,
      showHideOpacity: false,
      history: false,
      shareEl: false,
      closeOnScroll: false,
      hideAnimationDuration:0,
      showAnimationDuration:0
    });

    let removeVideos = () => {
      ps.container.querySelectorAll<HTMLVideoElement>('.pswp-video').forEach((video) => video.remove());
    }

    ps.listen('close', () => {
      this.psClose$.next();
    });
    ps.listen('destroy', () => {
      removeVideos();
    });
    ps.listen('beforeChange', () => {
      removeVideos();
    });
    ps.listen('afterChange', () => {
      if (ps.currItem.html) {
        let pid = (ps.currItem as PhotoSwipeItemWithPID).pid;
        let vidContainer = ps.container.querySelector<HTMLDivElement>(`#pswp-video-${pid}`);
        if(vidContainer) {
          let item = items.find(i => i.file_id === pid);
          let vid = document.createElement('video');
          vid.src = item.file_url;
          vid.autoplay = true;
          vid.controls = true;
          vid.poster = item.thumbnail_url;
          vid.loop = true;
          vid.className = 'pswp-video';
          vidContainer.prepend(vid);
        }
      }
    });
    ps.init();
    this.onMouseWheel$.pipe(takeUntil(this.psClose$)).subscribe((event) => {
      if(event.deltaY < 0) { //wheel up
        ps.prev();
      } else if (event.deltaY > 0) { //wheel down
        ps.next();
      }
    });
    this.onMouse$.pipe(takeUntil(this.psClose$)).subscribe((event) => {
      if(event.button == 1) {
        ps.close();
      }
    });
  }

}
