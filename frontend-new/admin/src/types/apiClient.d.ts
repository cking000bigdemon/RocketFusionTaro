declare module '@shared/api/ApiClient.js' {
  export class ApiClient {
    constructor(routerHandler?: any): ApiClient
    
    // C端移动应用API
    mobileLogin(credentials: { username: string; password: string; remember_me?: boolean }): Promise<any>
    mobileGetUserData(): Promise<any>
    mobileLogout(): Promise<any>
    mobileGetUserProfile(): Promise<any>
    mobileUpdateUserProfile(data: any): Promise<any>
    
    // B端管理API
    adminLogin(credentials: { username: string; password: string; remember_me?: boolean }): Promise<any>
    adminGetUsers(params?: any): Promise<any>
    adminCreateUser(userData: any): Promise<any>
    adminUpdateUser(id: number, userData: any): Promise<any>
    adminDeleteUser(id: number): Promise<any>
    adminGetUserData(params?: any): Promise<any>
    adminDeleteUserData(id: number): Promise<any>
    adminGetSystemStats(): Promise<any>
    adminLogout(): Promise<any>
  }
}