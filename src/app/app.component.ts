import { Component, ViewChild, OnInit } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  year = new Date().getFullYear();
  headerTitle = 'Service Calls';

  @ViewChild('drawer') drawer!: MatSidenav;

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {

        // close drawer after navigation
        if (this.drawer?.opened) this.drawer.close();

        // update header title from route data
        let route = this.activatedRoute;
        while (route.firstChild) route = route.firstChild;

        const title = route.snapshot.data?.['title'] as string | undefined;
        const id = route.snapshot.paramMap.get('id');

        // optional: show id in edit page
        if (title && id && route.snapshot.routeConfig?.path === 'service-calls/:id') {
          this.headerTitle = `${title} #${id}`;
        } else {
          this.headerTitle = title || 'Service Calls';
        }
      });
  }
}
