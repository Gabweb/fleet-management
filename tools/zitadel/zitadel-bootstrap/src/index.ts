import {ZApi, oidc} from './helpers';
import {readFile} from 'node:fs/promises';
const authority = 'http://fleet-zitadel:9090';
(async() => {
    const fc = JSON.parse((await readFile('../machinekey/zitadel-admin-sa.json')).toString('utf8'));
    const MUtoken = await oidc({
            ...fc,
            scope: [
                'openid',
                'profile',
                'email',
                'urn:zitadel:iam:org:project:id:zitadel:aud',
                'urn:zitadel:iam:org:project:id:252894205356015874:aud',
                'urn:iam:org:project:roles',
                'urn:zitadel:iam:org:projects:roles'
            ]
        }, authority
    );
    const token = await MUtoken();
    const api = ZApi(authority);
    try {
        // create root user
        const rootUser = await api({
            uri: '/management/v1/users/human',
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                // ['x-zitadel-orgid', zitadelOrgId]
            ]
            ,body: {
                userName: 'rootuser',
                profile: {
                  firstName: 'Root',
                  lastName: 'Root',
                  nickName: 'Root',
                  displayName: 'Root Root',
                  preferredLanguage: 'en',
                  gender: 'GENDER_OTHER'
                },
                email: {
                  email: 'root@zitade',
                  isEmailVerified: true
                },
                phone: {
                  phone: '+41 71 000 00 00',
                  isPhoneVerified: true
                },
                password: 'Passwrod1!',
                passwordChangeRequired: false,
                requestPasswordlessRegistration: false
            }
        });
        console.log('root user created');
        // give root user IAM_OWNER role
        await api({
            uri: '/admin/v1/members',
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`]
            ],
            body: {
                userId: rootUser.userId,
                roles: [
                    'IAM_OWNER'
                ]
              }
        });
        console.log('root user received owner role');
        // create fleet-management org
        const fleetOrg = await api({
            uri: '/management/v1/orgs',
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`]
            ]
            ,body: {
                name: 'fleet-management'
            }
        });
        console.log('org fleet-management created');
        // fleet management org user
        const fleetUser = await api({
            uri: '/management/v1/users/human',
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                ['x-zitadel-orgid', fleetOrg.id]
            ]
            ,body: {
                userName: 'fm-owner',
                profile: {
                  firstName: 'fm-owner',
                  lastName: 'fm-owner',
                  nickName: 'fm-owner',
                  displayName: 'fm-owner',
                  preferredLanguage: 'en',
                  gender: 'GENDER_OTHER'
                },
                email: {
                  email: 'fm-owner@zitade',
                  isEmailVerified: true
                },
                phone: {
                  phone: '+41 71 000 00 00',
                  isPhoneVerified: true
                },
                password: 'Passwrod1!',
                passwordChangeRequired: false,
                requestPasswordlessRegistration: false
            }
        });
        console.log('user for fleet management org created');
        // fleet user ORG_OWNER
        await api({
            uri: '/management/v1/orgs/me/members',
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                ['x-zitadel-orgid', fleetOrg.id]
            ],
            body: {
                userId: String(fleetUser.userId),
                roles: ['ORG_OWNER']
            }
        });
        console.log('fleet user ORG_OWNER');
        // fleet management service user
        const fleetServiceUser = await api({
            uri: '/management/v1/users/machine',
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                ['x-zitadel-orgid', fleetOrg.id]
            ]
            ,body: {
                userName: 'fleet-management-robot',
                name: 'Fleet management Machine Account',
                description: 'Fleet management Machine Account',
                accessTokenType: 'ACCESS_TOKEN_TYPE_BEARER'
            }
        });
        console.log('service user for fleet management org created');
        // fleet management project
        const project = await api({
            uri: '/management/v1/projects',
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                ['x-zitadel-orgid', fleetOrg.id]
            ]
            ,body: {
                name: 'fleet-management-project',
                projectRoleAssertion: true,
                projectRoleCheck: true,
                hasProjectCheck: true,
                privateLabelingSetting: 'PRIVATE_LABELING_SETTING_UNSPECIFIED'
            }
        });
        console.log('fleet management project created');
        const additionalRoles = [{
                key: 'role1',
                display_name: 'Custom role 1'
            }, {
                key: 'role2',
                display_name: 'Custom role 2'
        }];
        // give project some roles
        const projectRoles = await api({
            uri: `/management/v1/projects/${project.id}/roles/_bulk`,
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                ['x-zitadel-orgid', fleetOrg.id]
            ]
            ,body: {
                roles: additionalRoles
              }
        });
        console.log('fleet management roles added');
        // // project owners
        // const projectMemberServiceUser = await api({
        //     uri: `/management/v1/projects/${project.id}/members`,
        //     method: 'post',
        //     headers: [
        //         ['Content-Type', 'application/json'],
        //         ['Accept', 'application/json'],
        //         ['Authorization', `Bearer ${token.access_token}`],
        //         ['x-zitadel-orgid', fleetOrg.id]
        //     ]
        //     ,body: {
        //         userId: fleetServiceUser.userId,
        //         roles: [
        //             'PROJECT_OWNER'
        //         ]
        //     }
        // });
        
        // const projectMemberFleetUser = await api({
        //     uri: `/management/v1/projects/${project.id}/members`,
        //     method: 'post',
        //     headers: [
        //         ['Content-Type', 'application/json'],
        //         ['Accept', 'application/json'],
        //         ['Authorization', `Bearer ${token.access_token}`],
        //         ['x-zitadel-orgid', fleetOrg.id]
        //     ]
        //     ,body: {
        //         userId: fleetUser.userId,
        //         roles: [
        //             'PROJECT_OWNER'
        //         ]
        //     }
        // });
        // create api app
        const appApi = await api({
            uri: `/management/v1/projects/${project.id}/apps/api`,
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                ['x-zitadel-orgid', fleetOrg.id]
            ]
            ,body: {
                name: 'fleet-management-api-app',
                authMethodType: 'API_AUTH_METHOD_TYPE_PRIVATE_KEY_JWT'
            }
        });
        console.log('fleet management app api created');
        // create spa app
        const appSpa = await api({
            uri: `/management/v1/projects/${project.id}/apps/oidc`,
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                ['x-zitadel-orgid', fleetOrg.id]
            ]
            ,body: {
                name: 'fleet-management-spa-app',
                authMethodType: 'API_AUTH_METHOD_TYPE_PRIVATE_KEY_JWT',
                accessTokenType: 'OIDC_TOKEN_TYPE_JWT',
                accessTokenRoleAssertion: true,
                idTokenRoleAssertion: true,
                idTokenUserinfoAssertion: true
            }
        });
        console.log('fleet management app spa created');
        // create dummy user for login
        const fleetDummyUser = await api({
            uri: '/management/v1/users/human',
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                ['x-zitadel-orgid', fleetOrg.id]
            ]
            ,body: {
                userName: 'fm-dummy',
                profile: {
                  firstName: 'fm-dummy',
                  lastName: 'fm-dummy',
                  nickName: 'fm-dummy',
                  displayName: 'fm-dummy',
                  preferredLanguage: 'en',
                  gender: 'GENDER_OTHER'
                },
                email: {
                  email: 'fm-dummy@zitade',
                  isEmailVerified: true
                },
                phone: {
                  phone: '+41 71 000 00 00',
                  isPhoneVerified: true
                },
                password: 'Passwrod1!',
                passwordChangeRequired: false,
                requestPasswordlessRegistration: false
            }
        });
        console.log('fleet management dummy user');
        await api({
            uri: `/management/v1/users/${fleetDummyUser.userId}/grants`,
            method: 'post',
            headers: [
                ['Content-Type', 'application/json'],
                ['Accept', 'application/json'],
                ['Authorization', `Bearer ${token.access_token}`],
                ['x-zitadel-orgid', fleetOrg.id]
            ],
            body: {
                projectId: project.id,
                roleKeys: additionalRoles.map(({key}) => key)
              }
        });
        console.log('fleet management dummy user grant login');
    } catch (e) {
        console.error(JSON.stringify(e));
    }
})();