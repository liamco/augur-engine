import React, { Fragment } from "react";
import { NavLink } from "react-router-dom";

import styles from "./SidebarNavigation.module.css";
import BaseIcon from "#components/icons/BaseIcon.tsx";
import IconSkull from "#components/icons/IconSkull.tsx";

const SidebarNavigation = () => {
    return (
        <nav className={styles.SidebarNavigation}>
            <div className={styles.SidebarNavigationLinks}>
                <NavLink
                    to="/test-lab"
                    className={({ isActive }) =>
                        `${styles.SidebarNavigationItem} ${isActive ? styles.SidebarNavigationItemActive : ""}`
                    }
                >
                    <span className="text-blockcaps-xs">Test lab</span>
                </NavLink>
                <NavLink
                    to="/lists"
                    className={({ isActive }) =>
                        `${styles.SidebarNavigationItem} ${isActive ? styles.SidebarNavigationItemActive : ""}`
                    }
                >
                    <span className="text-blockcaps-xs">Rosters</span>
                </NavLink>
                <NavLink
                    to="/engagements"
                    className={({ isActive }) =>
                        `${styles.SidebarNavigationItem} ${isActive ? styles.SidebarNavigationItemActive : ""}`
                    }
                >
                    <span className="text-blockcaps-xs">Engagements</span>
                </NavLink>
            </div>
            <div className={styles.SidebarNavigationVersion}>
                <span className="text-blockcaps-xs">v 0.4</span>
                <BaseIcon size="small">
                    <IconSkull />
                </BaseIcon>
            </div>
        </nav>
    );
};

export default SidebarNavigation;
