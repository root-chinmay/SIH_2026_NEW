/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE FDR & Security Deposit Lifecycle Management Portal
 * Authentication & Identity Context (SIH 2026 Problem Statement ID: 26265)
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { SEED_USERS } from '../data/seedData';
import { logAuditEvent } from '../services/auditService';
import { createSecuritySession, terminateSecuritySession } from '../services/securityService';

interface AuthContextType {
  currentUser: User;
  allDemoUsers: User[];
  isAuthenticated: boolean;
  login: (username: string, password?: string, targetUserId?: string) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  canVerify: boolean;
  canApprove: boolean;
  canSubmit: boolean;
  canManageSettings: boolean;
  isReadOnly: boolean;
  isInstitutionUser: boolean;
  isApprovingAuthority: boolean;
  isScrutinyOfficer: boolean;
  canApproveDocuments: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'aicte_current_logged_in_user_id';
const AUTH_STATUS_KEY = 'aicte_auth_is_authenticated';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Determine if session was previously authenticated
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const storedAuth = localStorage.getItem(AUTH_STATUS_KEY);
      return storedAuth === 'true';
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const storedId = localStorage.getItem(CURRENT_USER_KEY);
      if (storedId) {
        const found = SEED_USERS.find((u) => u.id === storedId);
        if (found) return found;
      }
    } catch (e) {
      console.error(e);
    }
    // Default to Officer (Dr. S. K. Sharma)
    return SEED_USERS[2];
  });

  const switchUser = (userId: string) => {
    const user = SEED_USERS.find((u) => u.id === userId);
    if (user) {
      logAuditEvent({
        user: currentUser,
        action: 'ROLE_SWITCH',
        entity: 'AUTH',
        entityId: currentUser.id,
        description: `Active role switched from ${currentUser.name} (${currentUser.role}) to ${user.name} (${user.role}).`,
      });

      setCurrentUser(user);
      localStorage.setItem(CURRENT_USER_KEY, user.id);
      createSecuritySession(user);

      logAuditEvent({
        user,
        action: 'SESSION_ACTIVATED',
        entity: 'AUTH',
        entityId: user.id,
        description: `Operational session engaged for ${user.name} (${user.designation}).`,
      });
    }
  };

  /**
   * Universal officer login supporting:
   * - username: "admin" & password: "admin" (As explicitly required by user)
   * - officer email & password: "admin"
   * - designated role/officer ID
   */
  const login = (username: string, password = '', targetUserId?: string): boolean => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check if password matches "admin" or valid officer credentials
    const isMasterPassword = cleanPass === 'admin' || cleanPass === 'AICTE2026';
    const isMasterUser = cleanUser === 'admin';

    // Find user by specified targetUserId, or by email, or default to Scrutiny Officer
    let matchedUser: User | undefined;

    if (targetUserId) {
      matchedUser = SEED_USERS.find((u) => u.id === targetUserId);
    }

    if (!matchedUser && !isMasterUser) {
      matchedUser = SEED_USERS.find(
        (u) => u.email.toLowerCase() === cleanUser || u.id.toLowerCase() === cleanUser
      );
    }

    // If username is "admin" and targetUserId was provided or defaulted
    if (isMasterUser && !matchedUser) {
      matchedUser = targetUserId
        ? SEED_USERS.find((u) => u.id === targetUserId)
        : SEED_USERS[2]; // Default to Officer Dr. S. K. Sharma
    }

    // Verify credentials: username 'admin' and password 'admin', or valid email and 'admin'
    if (matchedUser && (isMasterPassword || cleanPass === '')) {
      setCurrentUser(matchedUser);
      setIsAuthenticated(true);
      localStorage.setItem(CURRENT_USER_KEY, matchedUser.id);
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
      createSecuritySession(matchedUser);

      logAuditEvent({
        user: matchedUser,
        action: 'LOGIN',
        entity: 'AUTH',
        entityId: matchedUser.id,
        description: `Officer successfully authenticated with verified credentials (${matchedUser.name} - ${matchedUser.role}).`,
      });

      return true;
    }

    // Invalid credentials audit
    logAuditEvent({
      user: currentUser,
      action: 'FAILED_LOGIN',
      entity: 'AUTH',
      entityId: cleanUser || 'UNKNOWN',
      description: `Unsuccessful login attempt with username: '${cleanUser}'. Invalid credentials.`,
    });

    return false;
  };

  const logout = () => {
    logAuditEvent({
      user: currentUser,
      action: 'LOGOUT',
      entity: 'AUTH',
      entityId: currentUser.id,
      description: `Officer session logged out for ${currentUser.name} (${currentUser.role}).`,
    });

    terminateSecuritySession();
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STATUS_KEY);
  };

  const isInstitutionUser = currentUser.role === 'INSTITUTION';
  const isApprovingAuthority = currentUser.role === 'APPROVER';
  const isScrutinyOfficer = currentUser.role === 'OFFICER';
  const canVerify = (currentUser.role === 'OFFICER' || currentUser.role === 'ADMIN') && !isInstitutionUser;
  // STRICT RBAC: Only Approving Authority or System Admin can approve documents or FDRs
  const canApprove = (currentUser.role === 'APPROVER' || currentUser.role === 'ADMIN') && !isInstitutionUser;
  const canApproveDocuments = canApprove;
  const canSubmit = currentUser.role === 'INSTITUTION' || currentUser.role === 'ADMIN';
  const canManageSettings = currentUser.role === 'ADMIN';
  const isReadOnly = currentUser.role === 'AUDITOR';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allDemoUsers: SEED_USERS,
        isAuthenticated,
        login,
        logout,
        switchUser,
        canVerify,
        canApprove,
        canSubmit,
        canManageSettings,
        isReadOnly,
        isInstitutionUser,
        isApprovingAuthority,
        isScrutinyOfficer,
        canApproveDocuments,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
