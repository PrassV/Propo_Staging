# Import all routers directly
from .auth import router as auth
from .property import router as property
from .tenants import router as tenant
from .user import router as user
from .dashboard import router as dashboard
from .rent_estimation import router as rent_estimation
from .maintenance import router as maintenance
from .vendor import router as vendor
from .payment import router as payment
from .agreement import router as agreement
from .document import router as document
from .reporting import router as reporting
from .notification import router as notification
from .uploads import router as uploads
