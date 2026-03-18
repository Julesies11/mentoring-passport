'use client';

import { JSX, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SIDEBAR_MENU_CONFIG } from '@/config/menu.config';
import { MenuConfig, MenuItem } from '@/config/types';
import { useAuth } from '@/auth/context/auth-context';
import { cn } from '@/lib/utils';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/components/ui/accordion-menu';
import { Badge } from '@/components/ui/badge';

export function SidebarMenu() {
  const { pathname } = useLocation();
  const auth = useAuth();
  const { role, isSysAdmin, isOrgAdmin, isSupervisor, isProgramMember } = auth;

  /**
   * Filter the master menu config based on current user capabilities
   */
  const filteredMenu = useMemo(() => {
    const filterItems = (items: MenuConfig): MenuConfig => {
      const result: MenuConfig = [];

      items.forEach((item) => {
        let isVisible = true;

        // 1. Check Role Requirement (Exact match since user only has one role)
        if (item.requiredRole && !item.requiredRole.includes(role || '')) {
          isVisible = false;
        }

        // 2. Check Flag Requirement (OR logic - if any flag is true, it's visible)
        if (item.requiredFlag) {
          isVisible = item.requiredFlag.some(flag => !!(auth as any)[flag]);
        }

        // Special case: Headings should only show if they have following items that are visible
        
        if (isVisible) {
          // If it has children, filter them too
          if (item.children) {
            const filteredChildren = filterItems(item.children);
            if (filteredChildren.length > 0) {
              result.push({ ...item, children: filteredChildren });
            }
          } else {
            result.push(item);
          }
        }
      });

      // Cleanup: Remove headings that have no visible items following them
      const finalResult: MenuConfig = [];
      for (let i = 0; i < result.length; i++) {
        const item = result[i];
        if (item.heading) {
          // Check if there are any non-heading items before the next heading or end of list
          let hasContent = false;
          for (let j = i + 1; j < result.length; j++) {
            if (result[j].heading) break;
            hasContent = true;
            break;
          }
          if (hasContent) finalResult.push(item);
        } else {
          finalResult.push(item);
        }
      }

      return finalResult;
    };

    return filterItems(SIDEBAR_MENU_CONFIG);
  }, [role, isSysAdmin, isOrgAdmin, isSupervisor, isProgramMember]);

  // Memoize matchPath to prevent unnecessary re-renders
  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname || (path.length > 1 && pathname.startsWith(path)),
    [pathname],
  );

  // Global classNames for consistent styling
  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1 space-y-3',
    group: 'gap-px',
    label:
      'uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px text-right px-2',
    separator: '',
    item: 'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
    sub: '',
    subTrigger:
      'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
    subContent: 'py-0',
    indicator: '',
  };

  const buildMenu = (items: MenuConfig): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.heading) {
        return buildMenuHeading(item, index);
      } else if (item.disabled) {
        return buildMenuItemRootDisabled(item, index);
      } else {
        return buildMenuItemRoot(item, index);
      }
    });
  };

  const buildMenuItemRoot = (item: MenuItem, index: number): JSX.Element => {
    const Icon = item.icon;
    const iconElement = Icon ? (
      typeof Icon === 'function' ? (
        <Icon />
      ) : (
        <span className="flex items-center justify-center size-5">
          <Icon data-slot="accordion-menu-icon" />
        </span>
      )
    ) : null;

    if (item.children) {
      return (
        <AccordionMenuSub key={index} value={item.path || `root-${index}`}>
          <AccordionMenuSubTrigger className="text-sm font-medium flex justify-between gap-2">
            {iconElement}
            <span data-slot="accordion-menu-title" className="flex-1 text-right">{item.title}</span>
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `root-${index}`}
            className="ps-6"
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-sm font-medium"
        >
          <Link
            to={item.path || '#'}
            className="flex items-center justify-between grow gap-2"
          >
            {iconElement}
            <span data-slot="accordion-menu-title" className="flex-1 text-right">{item.title}</span>
          </Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemRootDisabled = (
    item: MenuItem,
    index: number,
  ): JSX.Element => {
    const Icon = item.icon;
    const iconElement = Icon ? (
      typeof Icon === 'function' ? (
        <Icon />
      ) : (
        <span className="flex items-center justify-center size-5">
          <Icon data-slot="accordion-menu-icon" />
        </span>
      )
    ) : null;

    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-${index}`}
        className="text-sm font-medium"
      >
        {iconElement}
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuItemChildren = (
    items: MenuConfig,
    level: number = 0,
  ): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.disabled) {
        return buildMenuItemChildDisabled(item, index, level);
      } else {
        return buildMenuItemChild(item, index, level);
      }
    });
  };

  const buildMenuItemChild = (
    item: MenuItem,
    index: number,
    level: number = 0,
  ): JSX.Element => {
    const Icon = item.icon;
    const iconElement = Icon ? (
      typeof Icon === 'function' ? (
        <Icon />
      ) : (
        <span className="flex items-center justify-center size-5">
          <Icon data-slot="accordion-menu-icon" />
        </span>
      )
    ) : null;

    if (item.children) {
      return (
        <AccordionMenuSub
          key={index}
          value={item.path || `child-${level}-${index}`}
        >
          <AccordionMenuSubTrigger className="text-[13px] flex justify-between gap-2">
            {iconElement}
            <span className="flex-1 text-right">
              {item.collapse ? (
                <span className="text-muted-foreground">
                  <span className="hidden [[data-state=open]>span>&]:inline">
                    {item.collapseTitle}
                  </span>
                  <span className="inline [[data-state=open]>span>&]:hidden">
                    {item.expandTitle}
                  </span>
                </span>
              ) : (
                item.title
              )}
            </span>
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `child-${level}-${index}`}
            className={cn(
              'ps-4',
              !item.collapse && 'relative',
              !item.collapse && (level > 0 ? '' : ''),
            )}
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(
                item.children,
                item.collapse ? level : level + 1,
              )}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-[13px]"
        >
          <Link
            to={item.path || '#'}
            className="flex items-center justify-between grow gap-2"
          >
            {iconElement}
            <span data-slot="accordion-menu-title" className="flex-1 text-right">{item.title}</span>
          </Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemChildDisabled = (
    item: MenuItem,
    index: number,
    level: number = 0,
  ): JSX.Element => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-child-${level}-${index}`}
        className="text-[13px]"
      >
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuHeading = (item: MenuItem, index: number): JSX.Element => {
    return <AccordionMenuLabel key={index} className="text-right px-2">{item.heading}</AccordionMenuLabel>;
  };

  return (
    <div className="kt-scrollable-y-hover flex grow shrink-0 py-5 px-5 lg:max-h-[calc(100vh-5.5rem)]">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={classNames}
      >
        {buildMenu(filteredMenu)}
      </AccordionMenu>
    </div>
  );
}
