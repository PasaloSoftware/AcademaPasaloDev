import { ConfigService } from '@nestjs/config';
import { DriveScopeProvisioningService } from '@modules/media-access/application/drive-scope-provisioning.service';

type DriveScopeProvisioningServiceInternals = {
  getDriveClient: () => Promise<{ request: jest.Mock }>;
  listPermissions: (
    folderId: string,
  ) => Promise<Array<{ type?: string; role?: string; emailAddress?: string }>>;
};

describe('DriveScopeProvisioningService', () => {
  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  let service: DriveScopeProvisioningService;
  let internals: DriveScopeProvisioningServiceInternals;
  let mockClient: { request: jest.Mock };

  beforeEach(() => {
    service = new DriveScopeProvisioningService(configService);
    internals = service as unknown as DriveScopeProvisioningServiceInternals;
    mockClient = {
      request: jest.fn(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('no crea permiso cuando el grupo ya tiene cualquier rol', async () => {
    jest.spyOn(internals, 'getDriveClient').mockResolvedValue(mockClient);
    jest.spyOn(internals, 'listPermissions').mockResolvedValue([
      {
        type: 'group',
        role: 'writer',
        emailAddress: 'ev-1-viewers@academiapasalo.com',
      },
    ]);

    await service.ensureGroupReaderPermission(
      'folder-id',
      'ev-1-viewers@academiapasalo.com',
    );

    expect(mockClient.request).not.toHaveBeenCalled();
  });

  it('tolera 409 al crear permiso de forma concurrente', async () => {
    jest.spyOn(internals, 'getDriveClient').mockResolvedValue(mockClient);
    jest.spyOn(internals, 'listPermissions').mockResolvedValue([]);
    mockClient.request.mockRejectedValueOnce({ response: { status: 409 } });

    await expect(
      service.ensureGroupReaderPermission(
        'folder-id',
        'ev-2-viewers@academiapasalo.com',
      ),
    ).resolves.toBeUndefined();
  });

  it('listPermissions pagina correctamente cuando hay nextPageToken', async () => {
    jest.spyOn(internals, 'getDriveClient').mockResolvedValue(mockClient);
    mockClient.request
      .mockResolvedValueOnce({
        data: {
          permissions: [
            {
              id: 'p1',
              type: 'group',
              role: 'reader',
              emailAddress: 'g1@test.com',
            },
          ],
          nextPageToken: 'token-page-2',
        },
      })
      .mockResolvedValueOnce({
        data: {
          permissions: [
            {
              id: 'p2',
              type: 'group',
              role: 'reader',
              emailAddress: 'g2@test.com',
            },
          ],
        },
      });

    const permissions = await internals.listPermissions('folder-id');

    expect(permissions).toHaveLength(2);
    expect(mockClient.request).toHaveBeenCalledTimes(2);
    const secondCall = mockClient.request.mock.calls[1][0] as { url: string };
    expect(secondCall.url).toContain('pageToken=token-page-2');
  });

  it('findOrCreateDriveFolderUnderParent devuelve carpeta existente', async () => {
    jest.spyOn(internals, 'getDriveClient').mockResolvedValue(mockClient);
    mockClient.request.mockResolvedValueOnce({
      data: { files: [{ id: 'existing-folder-id' }] },
    });

    const result = await service.findOrCreateDriveFolderUnderParent(
      'parent-id',
      'mi-carpeta',
    );

    expect(result).toBe('existing-folder-id');
    expect(mockClient.request).toHaveBeenCalledTimes(1);
  });

  it('findOrCreateDriveFolderUnderParent crea carpeta cuando no existe', async () => {
    jest.spyOn(internals, 'getDriveClient').mockResolvedValue(mockClient);
    mockClient.request
      .mockResolvedValueOnce({ data: { files: [] } })
      .mockResolvedValueOnce({ data: { id: 'new-folder-id' } });

    const result = await service.findOrCreateDriveFolderUnderParent(
      'parent-id',
      'carpeta-nueva',
    );

    expect(result).toBe('new-folder-id');
    expect(mockClient.request).toHaveBeenCalledTimes(2);
  });

  it('findOrCreateDriveFolderUnderParent maneja race condition 409 y reintenta búsqueda', async () => {
    jest.spyOn(internals, 'getDriveClient').mockResolvedValue(mockClient);
    mockClient.request
      .mockResolvedValueOnce({ data: { files: [] } })
      .mockRejectedValueOnce({ response: { status: 409 } })
      .mockResolvedValueOnce({
        data: { files: [{ id: 'concurrent-folder-id' }] },
      });

    const result = await service.findOrCreateDriveFolderUnderParent(
      'parent-id',
      'carpeta-concurrente',
    );

    expect(result).toBe('concurrent-folder-id');
    expect(mockClient.request).toHaveBeenCalledTimes(3);
  });

  it('findOrCreateDriveFolderUnderParent lanza error cuando nombre es ambiguo', async () => {
    jest.spyOn(internals, 'getDriveClient').mockResolvedValue(mockClient);
    mockClient.request.mockResolvedValueOnce({
      data: { files: [{ id: 'id-1' }, { id: 'id-2' }] },
    });

    await expect(
      service.findOrCreateDriveFolderUnderParent('parent-id', 'ambiguo'),
    ).rejects.toThrow('ambiguo');
  });
});
